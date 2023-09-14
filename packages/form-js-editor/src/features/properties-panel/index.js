import PropertiesPanelModule from './PropertiesPanelRenderer';
import PropertiesProvider from './PropertiesProvider';

export default {
  __init__: [ 'propertiesPanel', 'propertiesProvider' ],
  propertiesPanel: [ 'type', PropertiesPanelModule ],
  propertiesProvider: [ 'type', PropertiesProvider ]
};