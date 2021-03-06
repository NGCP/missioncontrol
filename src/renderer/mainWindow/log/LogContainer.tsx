import { Event, ipcRenderer } from 'electron';
import moment, { Moment } from 'moment';
import React, {
  Component,
  createRef,
  ReactNode,
  RefObject,
} from 'react';
import {
  AutoSizer,
  CellMeasurerCache,
  CellMeasurer,
  List,
  ListRowProps,
} from 'react-virtualized';

import * as ComponentStyle from '../../../types/componentStyle';
import ipc from '../../../util/ipc';

import Select from '../../common/Select';

import './log.css';

interface State {
  /**
   * The current filter being applied to messages. If the filter is not "", then only messages
   * of the same type as the filter will be shown.
   */
  filter: ComponentStyle.MessageType;

  /**
   * All messages that have been logged. This includes message that are being hidden
   * if a filter is being applied.
   */
  messages: ComponentStyle.LogMessage[];

  /**
   * All messages that are being shown. If there's no filter, then this is the same
   * as messages. We have this as it improves performance (prevents having to filter
   * message every time the component is re-rendered) for a space (a duplicate array
   * of messages).
   */
  filteredMessages: ComponentStyle.LogMessage[];

  /**
   * Scroll to newest element or not.
   */
  scrollToBottom: boolean;
}

/**
 * Container that displays messages regarding status, error, etc.
 */
export default class LogContainer extends Component<ComponentStyle.ThemeProps, State> {
  /**
   * Value to ensure the onScroll works as intended (at least in our case).
   */
  private scrollFromUser = true;

  /**
   * Timeout for scrollFromUser variable.
   */
  private scrollFromUserTimer: NodeJS.Timeout | null = null;

  /**
   * Timeout that will scroll to bottom when it times out.
   */
  private scrollTimer: NodeJS.Timeout;

  /**
   * Cache that stores the height for all log messages. Allows the messages to have proper height.
   */
  private heightCache = new CellMeasurerCache({
    fixedWidth: true,
    minHeight: 20,
  });

  /**
   * Reference to log.
   */
  private ref: RefObject<List> = createRef();

  public constructor(props: ComponentStyle.ThemeProps) {
    super(props);

    this.state = {
      filter: '',
      messages: [],
      filteredMessages: [],
      scrollToBottom: true,
    };

    this.onScroll = this.onScroll.bind(this);
    this.onRowsRenderered = this.onRowsRenderered.bind(this);
    this.rowRenderer = this.rowRenderer.bind(this);
    this.clearMessages = this.clearMessages.bind(this);
    this.saveMessages = this.saveMessages.bind(this);
    this.updateFilter = this.updateFilter.bind(this);
    this.logMessages = this.logMessages.bind(this);

    this.scrollTimer = setTimeout((): void => {
      this.setState({ scrollToBottom: true });
      this.onRowsRenderered();
    }, 5000);
  }

  public componentDidMount(): void {
    ipcRenderer.on('logMessages', (_: Event, ...messages: ComponentStyle.LogMessage[]): void => this.logMessages(...messages));
  }

  /**
   * Resets scroll timer.
   */
  private onScroll(): void {
    if (!this.scrollFromUser) return;

    const { scrollToBottom } = this.state;

    if (scrollToBottom) this.setState({ scrollToBottom: false });

    clearTimeout(this.scrollTimer);
    this.scrollTimer = setTimeout((): void => {
      this.setState({ scrollToBottom: true });
      this.onRowsRenderered();
    }, 3000);
  }

  /**
   * Checks whenever rows are rendered.
   */
  private onRowsRenderered(): void {
    const { filteredMessages, scrollToBottom } = this.state;

    if (scrollToBottom) {
      const list = this.ref.current;
      if (!list) return;

      // Clear timeout of scrolling down and sets it again
      this.scrollFromUser = false;
      if (this.scrollFromUserTimer) {
        clearTimeout(this.scrollFromUserTimer);
      }
      this.scrollFromUserTimer = setTimeout((): void => { this.scrollFromUser = true; }, 150);
      list.scrollToRow(filteredMessages.length - 1);
    }
  }

  /**
   * Custom function to render a row in the list.
   */
  private rowRenderer(props: ListRowProps): ReactNode {
    const { filteredMessages } = this.state;
    const {
      index, key, parent, style,
    } = props;
    const message = filteredMessages[index];

    return (
      <CellMeasurer
        cache={this.heightCache}
        columnIndex={0}
        key={key}
        rowIndex={index}
        parent={parent}
      >
        <div className="row" style={style}>
          <div className="time">{(message.time as Moment).format('HH:mm:ss.SSS')}</div>
          <div className={`message ${message.type}`}>{message.message}</div>
        </div>
      </CellMeasurer>
    );
  }

  /**
   * Clears all the messages in the log.
   */
  private clearMessages(): void {
    this.heightCache.clearAll();

    this.setState({
      filter: '',
      messages: [],
      filteredMessages: [],
    });
  }

  /**
   * Changes the filter applied to the log.
   */
  private updateFilter(event: React.ChangeEvent<HTMLSelectElement>): void {
    const { messages } = this.state;

    this.heightCache.clearAll();
    const newFilter = event.currentTarget.value;

    // Ensures our new value has a type of MessageType.
    if ((!newFilter && newFilter !== '') || !ComponentStyle.isMessageType(newFilter)) return;

    this.setState({
      filter: newFilter as ComponentStyle.MessageType,
      filteredMessages: newFilter === '' ? messages.slice(0) : messages.filter((message): boolean => message.type === newFilter),
    });

    this.onRowsRenderered();
  }

  /**
   * Updates the messages in the log. Will update filtered messages accordingly.
   */
  private logMessages(...messages: ComponentStyle.LogMessage[]): void {
    const { filteredMessages, messages: thisMessages, filter } = this.state;
    const currentMessages = thisMessages;
    const currentFilteredMessages = filteredMessages;

    messages.forEach((message): void => {
      const msg: ComponentStyle.LogMessage = {
        type: message.type || '',
        message: message.message,
        time: message.time || moment(),
      };

      if (filter === '' || msg.type === filter) {
        currentFilteredMessages.push(msg);
      }
      currentMessages.push(msg);
    });

    this.setState({
      messages: currentMessages,
      filteredMessages: currentFilteredMessages,
    });

    this.onRowsRenderered();
  }

  /**
   * Combine the messages in the right format then pass it to postSaveLog.
   */
  private saveMessages(): void {
    const { messages } = this.state;
    let log = '';
    messages.forEach((message): void => {
      log += `${(message.time as Moment).format('YYYY-MM-DD HH:mm:ss.SSS')} - ${message.type} - ${message.message}\n`;
    });
    ipc.postSaveLog(log);
  }

  public render(): ReactNode {
    const { theme } = this.props;
    const { filteredMessages } = this.state;

    return (
      <div className={`logContainer container${theme === 'dark' ? '_dark' : ''}`}>
        <div className={`messages${theme === 'dark' ? '_dark' : ''}`}>
          <AutoSizer>
            {({ height, width }): ReactNode => (
              <List
                deferredMeasurementCache={this.heightCache}
                height={height}
                width={width}
                onScroll={this.onScroll}
                overscanRowCount={0}
                ref={this.ref}
                rowCount={filteredMessages.length}
                rowHeight={this.heightCache.rowHeight}
                rowRenderer={this.rowRenderer}
              />
            )}
          </AutoSizer>
        </div>
        <div className="control">
          <Select
            onChange={this.updateFilter}
            defaultOptionValue={{
              value: '',
              title: 'No filter',
            }}
            optionValues={[{
              value: 'success',
              title: 'Success',
            }, {
              value: 'progress',
              title: 'Progress',
            }, {
              value: 'failure',
              title: 'Failure',
            }]}
          />
          <button type="button" onClick={this.clearMessages}>Clear Log</button>
          <button type="button" onClick={this.saveMessages}>Save Log</button>
        </div>
      </div>
    );
  }
}
