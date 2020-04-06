import React, { PureComponent, ReactNode } from 'react';

import { ThemeProps } from '../../../types/componentStyle';
import ipc from '../../../util/ipc';

export interface CreateBoundingBoxButtonProps extends ThemeProps{
  /**
   * Identifier that distinguishes
   */
  name: string;

  /**
   * Name of the box itself, when it shows up on the map.
   */
  value: string;

  /**
   * Color of the box as it appears on the map.
   */
  color: string;
}

export default class CreateBoundingBoxButton extends PureComponent<CreateBoundingBoxButtonProps> {
  public constructor(props: CreateBoundingBoxButtonProps) {
    super(props);

    this.onClick = this.onClick.bind(this);
  }

  private onClick(): void {
    const { name, value, color } = this.props;
    ipc.postUnlockParameterInputs(name);
    ipc.postCreateBoundingBoxes({ name: value, color });
  }

  public render(): ReactNode {
    const { theme } = this.props;
    return (
      <button
        className={`boundingBoxButton${theme === 'dark' ? '_dark' : ''}`}
        type="button"
        onClick={this.onClick}
      >
        Create Box
      </button>
    );
  }
}
