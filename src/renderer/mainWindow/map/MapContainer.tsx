import { Event, ipcRenderer } from 'electron';
import fs from 'fs';
import Leaflet from 'leaflet';
import 'leaflet.offline';
import React, { Component, ReactNode } from 'react';
import { Map, Viewport } from 'react-leaflet';

import { Location, locationConfig } from '../../../static/index';

import { BoundingBoxBounds, ThemeProps } from '../../../types/componentStyle';
import { FileLoadOptions, FileSaveOptions } from '../../../types/fileOption';
import { VehicleObject } from '../../../types/vehicle';

import ipc from '../../../util/ipc';
import { updateVehicles } from '../../../util/util';

import GeolocationControl from './control/GeolocationControl';
import ThemeControl from './control/ThemeControl';

import BoundingBox from './shape/BoundingBox';

import POIMarker, { POIMarkerProps } from './marker/POIMarker';
import VehicleMarker from './marker/VehicleMarker';
import WaypointMarker from './marker/WaypointMarker';

import './map.css';

const mapUrl = 'https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}';
const mapOptions: Leaflet.TileLayerOptions = {
  attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
  id: 'mapbox.satellite',
  accessToken: process.env.MAPBOX_TOKEN,
};

/**
 * State of the map container.
 */
interface State {
  /**
   * Keeps track of map location and zoom.
   */
  viewport: Viewport;

  /**
   * Object of vehicles displayed in the user interface.
   */
  vehicles: { [vehicleId: number]: VehicleObject };

  /**
   * Bounding boxes for the mission. Not all missions need bounding boxes.
   */
  boundingBoxes: {
    [name: string]: {
      /**
       * Boundaries of the bounding box.
       */
      bounds: BoundingBoxBounds;

      /**
       * Color of the bounding box.
       */
      color?: string;

      /**
       * Whether or not the box is modifiable (resizeable, etc).
       */
      locked: boolean;
    };
  };

  /**
   * Waypoints with radius. Basically points that are required for a mission.
   * Not all waypoints require a radius.
   */
  waypoints: {
    [name: string]: {
      /**
       * Location of the waypoint itself.
       */
      location: Location;

      /**
       * Whether or not the waypoint is modifiable (draggable, etc).
       */
      locked: boolean;
    };
  };

  /**
   * Point of interests.
   */
  pois: { [hash: string]: POIMarkerProps };
}

/**
 * Container that displays all vehicles and mission related info in a map.
 */
export default class MapContainer extends Component<ThemeProps, State> {
  /**
   * Reference to map (to access its leaflet element).
   */
  private ref: React.RefObject<Map>;

  public constructor(props: ThemeProps) {
    super(props);

    const { startLocation } = locationConfig;

    this.state = {
      viewport: {
        center: [startLocation.lat, startLocation.lng],
        zoom: startLocation.zoom || 18,
      },
      vehicles: {},
      boundingBoxes: {},
      waypoints: {},
      pois: {},
    };

    this.ref = React.createRef();

    this.onlocationfound = this.onlocationfound.bind(this);
    this.onViewportChanged = this.onViewportChanged.bind(this);
    this.setTileLayer = this.setTileLayer.bind(this);
    this.setMapToUserLocation = this.setMapToUserLocation.bind(this);
    this.loadConfig = this.loadConfig.bind(this);
    this.saveConfig = this.saveConfig.bind(this);
    this.centerMapToVehicle = this.centerMapToVehicle.bind(this);
    this.createWaypoints = this.createWaypoints.bind(this);
    this.updateWaypoints = this.updateWaypoints.bind(this);
    this.createBoundingBoxes = this.createBoundingBoxes.bind(this);
    this.updateBoundingBoxes = this.updateBoundingBoxes.bind(this);
    this.updatePOIs = this.updatePOIs.bind(this);
  }

  public componentDidMount(): void {
    ipcRenderer.on('loadConfig', (_: Event, loadOptions: FileLoadOptions): void => this.loadConfig(loadOptions));
    ipcRenderer.on('saveConfig', (_: Event, saveOptions: FileSaveOptions): void => this.saveConfig(saveOptions));

    ipcRenderer.on('centerMapToVehicle', (_: Event, vehicle: VehicleObject): void => this.centerMapToVehicle(vehicle));
    ipcRenderer.on('setMapToUserLocation', this.setMapToUserLocation);
    ipcRenderer.on('updateMapLocation', (_: Event, location: Location): void => this.updateMapLocation(location));
    ipcRenderer.on('updateVehicles', (_: Event, ...vehicles: VehicleObject[]): void => updateVehicles(this, ...vehicles));

    ipcRenderer.on('createWaypoints', (_: Event, ...waypoints: { name: string; location: Location }[]): void => this.createWaypoints(...waypoints));
    ipcRenderer.on('updateWaypoints', (_: Event, updateMap: boolean, ...waypoints: { name: string; location: Location }[]): void => this.updateWaypoints(updateMap, ...waypoints));
    ipcRenderer.on('createBoundingBoxes', (_: Event, ...boundingBoxes: { name: string; color?: string; bounds: BoundingBoxBounds}[]): void => this.createBoundingBoxes(...boundingBoxes));
    ipcRenderer.on('updateBoundingBoxes', (_: Event, updateMap: boolean, ...boundingBoxes: { name: string; color?: string; bounds: BoundingBoxBounds}[]): void => this.updateBoundingBoxes(updateMap, ...boundingBoxes));

    ipcRenderer.on('updatePOIs', (_: Event, ...pois: POIMarkerProps[]): void => this.updatePOIs(...pois));

    this.setTileLayer();
  }

  /**
   * Callback to whenever geolocation call is successful.
   */
  private onlocationfound(location: Leaflet.LocationEvent): void {
    this.updateMapLocation(location.latlng);
  }

  /**
   * Callback to whenever the viewport has changed.
   */
  private onViewportChanged(viewport: Viewport): void {
    this.setState({ viewport });
  }

  /**
   * Create tile layer for map. Called after component is mount.
   */
  /* eslint-disable no-underscore-dangle, @typescript-eslint/no-explicit-any */
  private setTileLayer(): void {
    /*
     * Add cached tile layer to the map. Solution to the caching issue as there is no package that
     * supports react-leaflet, and creating a cached tile layer with react-leaflet and the package
     * above is extremely difficult.
     */
    const map = this.ref.current;
    if (map) {
      const cachedTileLayer = Leaflet.tileLayer
        .offline(mapUrl, mapOptions)
        .addTo(map.leafletElement);

      Leaflet.control.savetiles(cachedTileLayer, {
        saveWhatYouSee: true,
        saveText: '<i class="fa fa-download" aria-hidden="true" title="Save tiles"></i>',
        rmText: '<i class="fa fa-trash" aria-hidden="true" title="Remove tiles"></i>',
      }).addTo(map.leafletElement);

      cachedTileLayer.on('savestart', (): void => ipc.postLogMessages({
        type: 'progress',
        message: 'Saving tiles to cache',
      }));

      cachedTileLayer.on('loadend', (): void => ipc.postLogMessages({
        type: 'success',
        message: 'Saved all tiles to cache',
      }));

      cachedTileLayer.on('tilesremoved', (): void => ipc.postLogMessages({
        type: 'success',
        message: 'Removed all tiles from cache',
      }));
    }
  }
  /* eslint-enable */

  /**
   * Centers map to user location using geolocation (if possible).
   */
  private setMapToUserLocation(): void {
    const map = this.ref.current;
    if (map) map.leafletElement.locate();
  }

  /**
   * Updates map location.
   */
  private updateMapLocation(location: Location): void {
    const { viewport } = this.state;
    const { lat, lng, zoom } = location;

    this.onViewportChanged({ center: [lat, lng], zoom: zoom || viewport.zoom });
  }

  /**
   * Callback whenever a "loadConfig" notification is received.
   */
  private loadConfig({ map }: FileLoadOptions): void {
    this.updateMapLocation(map);
  }

  /**
   * Callback whenever a "saveConfig" notification is received.
   */
  private saveConfig(file: FileSaveOptions): void {
    // Performs a hard copy of this.state, deletes vehicles from it, and saves it to file.
    const data = { ...this.state };
    delete data.boundingBoxes;
    delete data.vehicles;
    delete data.waypoints;

    fs.writeFileSync(file.filePath, JSON.stringify({
      ...file.data,
      map: data,
    }, null, 2));
  }

  /**
   * Centers map around a certain vehicle.
   */
  private centerMapToVehicle(vehicle: VehicleObject): void {
    this.updateMapLocation(vehicle);
  }

  /**
   * Creates waypoints.
   */
  private createWaypoints(...waypoints: { name: string; location?: Location }[]): void {
    const { viewport, waypoints: currentWaypoints } = this.state;
    const newWaypoints = currentWaypoints;

    waypoints.forEach((waypoint): void => {
      if (!newWaypoints[waypoint.name]) {
        newWaypoints[waypoint.name] = {
          locked: false,
          location: waypoint.location || (viewport.center && {
            lat: viewport.center[0],
            lng: viewport.center[1],
          }) || locationConfig.startLocation,
        };

        ipc.postUpdateWaypoints(false, {
          name: waypoint.name,
          location: newWaypoints[waypoint.name].location,
        });
      }
    });

    this.setState({ waypoints: newWaypoints });
  }

  /**
   * Updates waypoints.
   */
  private updateWaypoints(
    updateMap: boolean,
    ...waypoints: { name: string; location: Location }[]
  ): void {
    if (!updateMap) return;

    const { waypoints: currentWaypoints } = this.state;
    const newWaypoints = currentWaypoints;

    waypoints.forEach((waypoint): void => {
      if (newWaypoints[waypoint.name]) {
        newWaypoints[waypoint.name].location = waypoint.location;
      }
    });

    this.setState({ waypoints: newWaypoints });
  }

  /**
   * Creates bounding boxes.
   */
  private createBoundingBoxes(
    ...boundingBoxes: {
      name: string;
      bounds?: BoundingBoxBounds;
      color?: string;
    }[]
  ): void {
    const { boundingBoxes: currentBoundingBoxes, viewport } = this.state;
    const newBoundingBoxes = currentBoundingBoxes;

    boundingBoxes.forEach((boundingBox): void => {
      if (!newBoundingBoxes[boundingBox.name]) {
        newBoundingBoxes[boundingBox.name] = {
          color: boundingBox.color || 'red',
          bounds: boundingBox.bounds || (viewport.center && {
            top: viewport.center[0],
            bottom: viewport.center[0],
            left: viewport.center[1],
            right: viewport.center[1],
          }) || {
            top: locationConfig.startLocation.lat,
            bottom: locationConfig.startLocation.lat,
            left: locationConfig.startLocation.lng,
            right: locationConfig.startLocation.lng,
          },
          locked: false,
        };
      }

      ipc.postUpdateBoundingBoxes(false, {
        name: boundingBox.name,
        bounds: newBoundingBoxes[boundingBox.name].bounds,
      });
    });

    this.setState({ boundingBoxes: newBoundingBoxes });
  }

  /**
   * Updates bounding boxes.
   */
  private updateBoundingBoxes(
    updateMap: boolean,
    ...boundingBoxes: {
      name: string;
      bounds: BoundingBoxBounds;
      color?: string;
    }[]
  ): void {
    if (!updateMap) return;

    const { boundingBoxes: currentBoundingBoxes } = this.state;
    const newBoundingBoxes = currentBoundingBoxes;

    boundingBoxes.forEach((boundingBox): void => {
      if (newBoundingBoxes[boundingBox.name]) {
        newBoundingBoxes[boundingBox.name].bounds = boundingBox.bounds;
        if (boundingBox.color) newBoundingBoxes[boundingBox.name].color = boundingBox.color;
      }
    });

    this.setState({ boundingBoxes: newBoundingBoxes });
  }

  /**
   * Creates/updates point of interests.
   */
  private updatePOIs(...pois: POIMarkerProps[]): void {
    const { pois: currentPois } = this.state;
    const newPois = currentPois;

    pois.forEach((poi): void => {
      const hash = `${poi.location.lat}#${poi.location.lng}`;
      newPois[hash] = poi;
    });

    this.setState({ pois: newPois });
  }

  public render(): ReactNode {
    const { theme } = this.props;
    const {
      viewport,
      boundingBoxes,
      pois,
      vehicles,
      waypoints,
    } = this.state;

    const boundingBoxRectangles = Object.keys(boundingBoxes)
      .map((name): ReactNode => (
        <BoundingBox
          key={name}
          name={name}
          color={boundingBoxes[name].color}
          locked={boundingBoxes[name].locked}
          startingBounds={boundingBoxes[name].bounds}
        />
      ));

    const vehicleMarkers = Object.keys(vehicles)
      .map((vehicleId): ReactNode => (
        <VehicleMarker
          key={vehicleId}
          vehicle={vehicles[parseInt(vehicleId, 10)]}
        />
      ));

    const waypointMarkers = Object.keys(waypoints)
      .map((name): ReactNode => (
        <WaypointMarker
          key={name}
          name={name}
          location={waypoints[name].location}
          locked={waypoints[name].locked}
        />
      ));

    const poiMarkers = Object.keys(pois)
      .map((hash): ReactNode => (
        <POIMarker
          location={pois[hash].location}
          type={pois[hash].type}
        />
      ));

    return (
      <Map
        className="mapContainer container"
        viewport={viewport}
        ref={this.ref}
        onlocationfound={this.onlocationfound}
        onViewportChanged={this.onViewportChanged}
      >
        <GeolocationControl />
        <ThemeControl theme={theme} />
        <>{boundingBoxRectangles}</>
        <>{vehicleMarkers}</>
        <>{waypointMarkers}</>
        <>{poiMarkers}</>
      </Map>
    );
  }
}
