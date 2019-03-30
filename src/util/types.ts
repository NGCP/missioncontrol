/**
 * Props with theme as its child. Feel free to extend this prop.
 */
export interface ThemeProps {
  /**
   * "Light" for light theme, "dark" for dark theme.
   */
  theme: 'light' | 'dark';
}

/**
 * Type guard to ThemeProps. Checks if the theme property is "light" or "dark".
 */
export function isThemeProps(props: { theme: string }): boolean {
  return props.theme === 'light' || props.theme === 'dark';
}

/**
 * Types for all messages. Consists of "success", "failure", "progress", or "".
 */
export type MessageType = '' | 'success' | 'failure' | 'progress';

/**
 * Type guard to MessageType. checks if the type is "success", "failure", "progress", or "".
 */
export function isMessageType(type: string): boolean {
  return type === '' || type === 'success' || type === 'failure' || type === 'progress';
}

/**
 * Types for all vehicle status. These statuses are generated by the vehicle depending on the
 * mission or its status, generated by the Orchestrator.
 */
export type VehicleStatus = 'ready' | 'error' | 'disconnected' | 'waiting' | 'running' | 'paused';

/**
 * Type guard for VehicleStatus.
 */
export function isVehicleStatus(status: string): boolean {
  return status === 'ready' || status === 'error' || status === 'disconnected' || status === 'waiting' || status === 'running' || status === 'paused';
}

/**
 * Actual vehicle values. This can change as Orchestrator is re-implemented into TypeScript.
 */
export interface Vehicle {
  /**
   * The ID of the vehicle.
   */
  sid: number;

  /**
   * Latitude location of the vehicle.
   */
  lat: number;

  /**
   * Longitude location of the vehicle.
   */
  lng: number;

  /**
   * Altitude of the vehicle.
   */
  alt?: number;

  /**
   * Current vehicle heading.
   */
  heading?: number;

  /**
   * Current battery of the vehicle, expressed as a decimal. Will vary from 0 to 1.
   */
  battery?: number;

  /**
   * Status of the vehicle. Generated by the vehicles themselves or by the Orchestrator.
   */
  status: VehicleStatus;
  errorMessage?: string;
}

/**
 * Vehicle object typings that are used in the user interface (mainly map and vehicle container).
 */
export interface VehicleUI {
  /**
   * The ID of the vehicle.
   */
  sid: number;

  /**
   * The name of the vehicle.
   */
  name: string;

  /**
   * The type of the vehicle.
   */
  type: string;

  /**
   * Latitude location of the vehicle.
   */
  lat: number;

  /**
   * Longitude location of the vehicle.
   */
  lng: number;

  /**
   * Altitude of the vehicle.
   */
  alt?: number;

  /**
   * Current vehicle heading.
   */
  heading?: number;

  /**
   * Current battery of the vehicle, expressed as a decimal. Will vary from 0 to 1.
   */
  battery?: number;

  /**
   * Status of the vehicle. This is the way the status is displayed on the user interface.
   */
  status: {
    /**
     * The type of status current status is.
     */
    type: MessageType;

    /**
     * The content of the message of the status.
     */
    message: string;
  };
  errorMessage?: string;
}

/**
 * Types for maps to use.
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

/**
 * Signature to the locations variable in locations.json.
 */
export interface LocationSignature {
  [key: string]: LatLngZoom;
}

/**
 * Signature to the vehicleInfos variable in vehicle.json.
 */
export interface VehicleInfoSignature {
  [key: string]: {
    macAddress: string;
    name: string;
    type: string;
  };
}

/**
 * Signature to the vehicleStatuses variable in vehicle.json.
 */
export interface VehicleStatusSignature {
  [key: string]: {
    type: string;
    message: string;
  };
}
