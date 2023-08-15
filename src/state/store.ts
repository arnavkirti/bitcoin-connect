import {createStore} from 'zustand/vanilla';
import {Connector} from '../connectors/Connector';
import {ConnectorConfig} from '../types/ConnectorConfig';
import {connectors} from '../connectors';
import {dispatchLwcEvent} from '../utils/dispatchLwcEvent';

interface PrivateStore {
  readonly connector: Connector | undefined;
  readonly config: ConnectorConfig | undefined;
  setConfig(config: ConnectorConfig | undefined): void;
  setConnector(connector: Connector | undefined): void;
}

const privateStore = createStore<PrivateStore>((set) => ({
  connector: undefined,
  config: undefined,
  setConfig: (config) => {
    set({config});
  },
  setConnector: (connector) => {
    set({connector});
  },
}));

interface Store {
  readonly connected: boolean;
  readonly connecting: boolean;
  readonly alias: string | undefined;
  readonly balance: number | undefined;
  readonly connectorName: string | undefined;

  connect(config: ConnectorConfig): void;
  disconnect(): void;
  setAlias(alias: string | undefined): void;
  setBalance(balance: number | undefined): void;
}

const store = createStore<Store>((set) => ({
  connected: false,
  connecting: false,
  alias: undefined,
  balance: undefined,
  connectorName: undefined,
  connect: async (config: ConnectorConfig) => {
    dispatchLwcEvent('lwc:connecting');
    set({
      connecting: true,
    });
    try {
      const connector = new connectors[config.connectorType](config);
      await connector.init();
      privateStore.getState().setConfig(config);
      privateStore.getState().setConnector(connector);
      set({
        connected: true,
        connecting: false,
        connectorName: config.connectorName,
      });
      dispatchLwcEvent('lwc:connected');
    } catch (error) {
      console.error(error);
      set({
        connecting: false,
      });
    }
    saveConfig(config);
  },
  disconnect: () => {
    privateStore.getState().setConfig(undefined);
    privateStore.getState().setConnector(undefined);
    set({
      connected: false,
      alias: undefined,
      balance: undefined,
      connectorName: undefined,
    });
    deleteConfig();
    dispatchLwcEvent('lwc:disconnected');
  },
  setAlias: (alias) => {
    set({alias});
  },
  setBalance: (balance) => {
    set({balance});
  },
  getConnectorName: () => privateStore.getState().config?.connectorName,
}));

export default store;

function deleteConfig() {
  window.localStorage.removeItem('lwc:config');
}

function saveConfig(config: ConnectorConfig) {
  window.localStorage.setItem('lwc:config', JSON.stringify(config));
}

function loadConfig() {
  const configJson = window.localStorage.getItem('lwc:config');
  if (configJson) {
    const config = JSON.parse(configJson) as ConnectorConfig;
    store.getState().connect(config);
  }
}

loadConfig();
