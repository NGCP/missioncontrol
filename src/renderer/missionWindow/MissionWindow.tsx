/* eslint-disable import/no-named-as-default */

import { Event, ipcRenderer } from 'electron';
import React, { Component, ReactNode } from 'react';
import * as Slider from 'rc-slider';

import { JobType } from '../../static/index';

import { ThemeProps } from '../../types/componentStyle';
import * as MissionInformation from '../../types/missionInformation';
import { VehicleObject, VehicleStatus } from '../../types/vehicle';

import { updateVehicles } from '../../util/util';

import ActiveVehicleMapping from './extra/ActiveVehicleMapping';
import MissionOptions from './extra/MissionOptions';

import ISRSearch from './parameter/ISRSearch';
import PayloadDrop from './parameter/PayloadDrop';
import UGVRescue from './parameter/UGVRescue';
import UUVRescue from './parameter/UUVRescue';
import VTOLSearch from './parameter/VTOLSearch';

import ipc from '../../util/ipc';

import './mission.css';

const Range = Slider.createSliderWithTooltip(Slider.Range);

interface MissionLayout {
  missionName: MissionInformation.MissionName;
  layout: React.ElementType;
}

const layouts: { [key: string]: MissionLayout[] } = {
  land: [ISRSearch, VTOLSearch, PayloadDrop, UGVRescue],
  underwater: [ISRSearch, VTOLSearch, PayloadDrop, UUVRescue],
};

const title: { [missionName in MissionInformation.MissionName]: string } = {
  isrSearch: 'ISR Search',
  vtolSearch: 'VTOL Search',
  payloadDrop: 'Payload Drop',
  ugvRescue: 'UGV Rescue',
  uuvRescue: 'UUV Rescue',
};

interface State {
  /**
   * Land missionType means we are performing UGV mission.
   * Underwater missionType means we are performing UUV mission.
   */
  missionType: 'land' | 'underwater';

  /**
   * True if user should need to confirm before starting next mission.
   */
  requireConfirmation: boolean;

  /**
   * First mission to perform.
   */
  startMissionIndex: number;

  /**
   * Last mission to perform.
   */
  endMissionIndex: number;

  /**
   * Current status of mission. All statuses will apply to mission except for
   * "waiting", "error", and "disconnected".
   *
   * A little different since when the first mission finishes, the status will go
   * to "next" instead of back to ready. From "next", it goes to "running", etc...
   */
  status: VehicleStatus | 'next';

  /**
   * Current vehicles connected.
   */
  vehicles: { [vehicleId: number]: VehicleObject };

  /**
   * Mapping for all missions selected.
   */
  activeVehicleMapping: MissionInformation.ActiveVehicleMapping;

  /**
   * Options for the missions.
   */
  options: MissionInformation.MissionOptions;

  /**
   * Information passed to Orchestrator for Mission to start.
   */
  information: { [missionName: string]: undefined | MissionInformation.Information };
}

/**
 * Mission window component.
 */
export default class MissionWindow extends Component<ThemeProps, State> {
  public constructor(props: ThemeProps) {
    super(props);

    this.state = {
      missionType: 'land',
      requireConfirmation: true,
      startMissionIndex: 0,
      endMissionIndex: 0,
      status: 'ready',
      vehicles: {},
      activeVehicleMapping: {
        isrSearch: {},
        vtolSearch: {},
        payloadDrop: {},
        ugvRescue: {},
        uuvRescue: {},
      },
      options: {
        isrSearch: {
          noTakeoff: false,
          noLand: false,
        },
        payloadDrop: {
          noTakeoff: false,
          noLand: false,
        },
      },
      information: {},
    };

    this.onSliderChange = this.onSliderChange.bind(this);
    this.updateInformation = this.updateInformation.bind(this);
    this.updateOptions = this.updateOptions.bind(this);
    this.postStartMissions = this.postStartMissions.bind(this);
    this.toggleMissionType = this.toggleMissionType.bind(this);
    this.tipFormatter = this.tipFormatter.bind(this);
  }

  public componentDidMount(): void {
    ipcRenderer.on('updateVehicles', (_: Event, ...vehicles: VehicleObject[]): void => updateVehicles(this, ...vehicles));

    ipcRenderer.on('updateInformation', (_: Event, information: MissionInformation.Information): void => this.updateInformation(information));
    ipcRenderer.on('updateOptions', (_: Event, missionName: MissionInformation.MissionName, option: string, value: boolean): void => this.updateOptions(missionName, option, value));
    ipcRenderer.on('updateActiveVehicleMapping', (_: Event, missionName: MissionInformation.MissionName, jobType: JobType, vehicleId: number): void => this.updateActiveVehicleMapping(missionName, jobType, vehicleId));

    ipcRenderer.on('confirmCompleteMission', (): void => { this.setState({ status: 'next' }); });
    ipcRenderer.on('stopMissions', (): void => { this.setState({ status: 'ready' }); });
  }

  private onSliderChange(value: [number, number]): void {
    this.setState({
      startMissionIndex: value[0],
      endMissionIndex: value[1],
    });
  }

  private updateInformation(information: MissionInformation.Information): void {
    const { information: currentInformation } = this.state;
    const newInformation = currentInformation;

    newInformation[information.missionName] = information;
    this.setState({ information: newInformation });
  }

  private updateOptions(
    missionName: MissionInformation.MissionName,
    option: string,
    value: boolean,
  ): void {
    const { options: currentOptions } = this.state;
    const newOptions = currentOptions;

    switch (missionName) {
      case 'isrSearch':
        if (option === 'noTakeoff') newOptions.isrSearch.noTakeoff = value;
        if (option === 'noLand') newOptions.isrSearch.noLand = value;
        break;

      case 'payloadDrop':
        if (option === 'noTakeoff') newOptions.payloadDrop.noTakeoff = value;
        if (option === 'noLand') newOptions.payloadDrop.noLand = value;
        break;

      default:
        throw new RangeError(`Tried to change mission option for ${missionName}`);
    }

    this.setState({ options: newOptions });
  }

  private updateActiveVehicleMapping(
    missionName: MissionInformation.MissionName,
    jobType: JobType,
    vehicleId: number,
  ): void {
    const { activeVehicleMapping: currentActiveVehicleMapping } = this.state;
    const newActiveVehicleMapping = currentActiveVehicleMapping;

    newActiveVehicleMapping[missionName][vehicleId] = jobType;
    this.setState({ activeVehicleMapping: newActiveVehicleMapping });
  }

  private postStartMissions(): void {
    const {
      activeVehicleMapping,
      endMissionIndex,
      information,
      missionType,
      options,
      requireConfirmation,
      startMissionIndex,
    } = this.state;

    // Gets all relevant mission information for the missions being performed for the mission type.
    const missionInformation = layouts[missionType].slice(startMissionIndex, endMissionIndex + 1)
      .map(({ missionName }): MissionInformation.Information => {
        if (!information[missionName]) {
          throw new Error(`Undefined mission information for ${missionName}`);
        }
        return information[missionName] as MissionInformation.Information;
      });

    ipc.postStartMissions(missionInformation, activeVehicleMapping, options, requireConfirmation);
  }

  private toggleMissionType(): void {
    const { missionType } = this.state;
    this.setState({ missionType: missionType === 'land' ? 'underwater' : 'land' });
  }

  private tipFormatter(value: number): string {
    const { missionType } = this.state;
    const { missionName } = layouts[missionType][value];

    return title[missionName];
  }

  public render(): ReactNode {
    const { theme } = this.props;
    const {
      information,
      missionType,
      status,
      startMissionIndex,
      endMissionIndex,
      options,
      vehicles,
    } = this.state;

    // Text displayed on toggle button.
    const missionTypeText = missionType === 'land' ? 'Land Missions' : 'Underwater Missions';

    /*
     * Used to render mission UI layout as well as determine which mission layout
     * corresponds to which mission information.
     */
    const { layout: Layout, missionName } = layouts[missionType][startMissionIndex];

    // Used to render all the required jobs and options.
    const missionNames = layouts[missionType].slice(startMissionIndex, endMissionIndex + 1)
      .map((layout): MissionInformation.MissionName => layout.missionName);

    /*
     * Start button will not appear unless all mission information is filled out
     * (and no mission is running).
     */
    const readyToStart = information[missionName] !== undefined;

    return (
      <div className={`missionWrapper${theme === 'dark' ? '_dark' : ''}`}>
        <div className="selectorContainer">
          <button className="selectorButton" type="button" onClick={this.toggleMissionType}>{missionTypeText}</button>
          <Range
            className={`selectorSlider${theme === 'dark' ? '_dark' : ''}`}
            min={0}
            max={layouts[missionType].length - 1}
            onChange={this.onSliderChange}
            tipFormatter={this.tipFormatter}
          />
        </div>
        <div className="parameterContainer">
          <h1 style={{ marginTop: 0 }}>Parameters</h1>
          {status === 'ready' && <Layout />}
          {status !== 'ready' && <p>:)</p>}
        </div>
        <div className="mappingContainer">
          <h1 style={{ marginTop: 0 }}>Vehicle Mapping</h1>
          <ActiveVehicleMapping title={title} vehicles={vehicles} missionNames={missionNames} />
        </div>
        <div className="optionsContainer">
          <h1 style={{ marginTop: 0 }}>Options</h1>
          <MissionOptions title={title} missionNames={missionNames} options={options} />
        </div>
        <div className="buttonContainer">
          {status === 'ready' && <button type="button" disabled={!readyToStart} onClick={this.postStartMissions}>Start Missions</button>}
          {status !== 'ready' && <button type="button" onClick={ipc.postStopMissions}>Stop Missions</button>}
          {status === 'running' && <button type="button" onClick={ipc.postPauseMission}>Pause Mission</button>}
          {status === 'paused' && <button type="button" onClick={ipc.postResumeMission}>Resume Mission</button>}
          {status === 'next' && <button type="button" onClick={ipc.postStartNextMission}>Next Mission</button>}
        </div>
      </div>
    );
  }
}