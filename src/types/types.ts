/**
 * Status of the vehicle, lets us know of where the vehicle is in its mission.
 */
export type VehicleStatus = 'ready' | 'error' | 'disconnected' | 'waiting' | 'running' | 'paused';

export function isVehicleStatus(status: string): boolean {
  return status === 'ready' || status === 'error' || status === 'disconnected' || status === 'waiting' || status === 'running' || status === 'paused';
}

/**
 * Props with theme as its child. Feel free to extend this prop.
 */
export interface ThemeProps {
  /**
   * "Light" for light theme, "dark" for dark theme.
   */
  theme: 'light' | 'dark';
}

export function isThemeProps(props: { theme: string }): boolean {
  return props.theme === 'light' || props.theme === 'dark';
}

/**
 * Types for all messages. Consists of "success", "failure", "progress", or "".
 */
export type MessageType = '' | 'success' | 'failure' | 'progress';

export function isMessageType(type: string): boolean {
  return type === '' || type === 'success' || type === 'failure' || type === 'progress';
}

/**
 * Latitude, longitude and zoom.
 */
export interface LatLngZoom {
  /**
   * Latitude of center of map.
   */
  lat: number;

  /**
   * Longitude of center of map.
   */
  lng: number;

  /**
   * Zoom level of map.
   */
  zoom?: number;
}

/**
 * Vehicle object for all classes to use. This is necessary because Vehicle class will
 * be uncasted when being sent through ipcRenderer.
 */
export interface VehicleObject {
  /**
   * ID of the vehicle.
   */
  vehicleId: number;

  /**
   * Current status of the vehicle.
   */
  status: VehicleStatus;

  /**
   * Jobs of the vehicle.
   */
  jobs: string[];

  /**
   * Current latitude of the vehicle. Starts at 0.
   */
  lat: number;

  /**
   * Current longitude of the vehicle. Starts at 0.
   */
  lng: number;

  /**
   * Current altitude of the vehicle.
   */
  alt?: number;
  /**
   *
   * Current battery of the vehicle, expressed as a decimal. Will vary from 0 to 1.
   */
  battery?: number;

  /**
   * Current vehicle heading. Value is in degrees.
   */
  heading?: number;
}

/**
 * Status of a mission.
 */
export interface MissionStatus {
  name: 'notStarted' |'started' | 'paused' | 'completed';
  message: string;
  type: MessageType;
}

/**
 * Structure of a typical mission.
 */
export interface Mission {
  /**
   * Name of the mission.
   */
  name?: string;
  /**
   * Description of the mission.
   */
  description: string;

  /**
   * Status of the misison.
   */
  status: MissionStatus;
}

/**
 * Structure of a typical job.
 */
export interface Job {
  /**
   * Name of the job.
   */
  name: string;

  /**
   * Description of the job.
   */
  description: string;

  /**
   * Whether or not the job can be skipped.
   */
  optional?: boolean;

  /**
   * Whether or not the user can pause the job.
   */
  pausable?: boolean;
}

/**
 * Data contents for information that is loaded from a configuration file.
 */
export interface FileLoadOptions {
  /**
   * Information related to the map.
   */
  map: LatLngZoom;
}

/**
 * Object structure for information stored into a configuration file.
 */
export interface FileSaveOptions {
  /**
   * Filepath of the configuration file being saved.
   */
  filePath: string;

  /**
   * Data contents. Will be modified by classes through the "loadConfig" notification.
   */
  data: FileLoadOptions;
}