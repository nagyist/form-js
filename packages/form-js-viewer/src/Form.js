import Ids from 'ids';
import { get, isObject, isString, isUndefined, set } from 'min-dash';

import {
  ExpressionLanguageModule,
  MarkdownModule,
  ViewerCommandsModule,
  RepeatRenderModule
} from './features';

import core from './core';

import { clone, createFormContainer, createInjector } from './util';

/**
 * @typedef { import('./types').Injector } Injector
 * @typedef { import('./types').Data } Data
 * @typedef { import('./types').Errors } Errors
 * @typedef { import('./types').Schema } Schema
 * @typedef { import('./types').FormProperties } FormProperties
 * @typedef { import('./types').FormProperty } FormProperty
 * @typedef { import('./types').FormEvent } FormEvent
 * @typedef { import('./types').FormOptions } FormOptions
 *
 * @typedef { {
 *   data: Data,
 *   initialData: Data,
 *   errors: Errors,
 *   properties: FormProperties,
 *   schema: Schema
 * } } State
 *
 * @typedef { (type:FormEvent, priority:number, handler:Function) => void } OnEventWithPriority
 * @typedef { (type:FormEvent, handler:Function) => void } OnEventWithOutPriority
 * @typedef { OnEventWithPriority & OnEventWithOutPriority } OnEventType
 */

const ids = new Ids([ 32, 36, 1 ]);

/**
 * The form.
 */
export default class Form {

  /**
   * @constructor
   * @param {FormOptions} options
   */
  constructor(options = {}) {

    /**
     * @public
     * @type {OnEventType}
     */
    this.on = this._onEvent;

    /**
     * @public
     * @type {String}
     */
    this._id = ids.next();

    /**
     * @private
     * @type {Element}
     */
    this._container = createFormContainer();

    const {
      container,
      injector = this._createInjector(options, this._container),
      properties = {}
    } = options;

    /**
     * @private
     * @type {State}
     */
    this._state = {
      initialData: null,
      data: null,
      properties,
      errors: {},
      schema: null
    };

    this.get = injector.get;

    this.invoke = injector.invoke;

    this.get('eventBus').fire('form.init');

    if (container) {
      this.attachTo(container);
    }
  }

  clear() {

    // clear form services
    this._emit('diagram.clear');

    // clear diagram services (e.g. EventBus)
    this._emit('form.clear');
  }

  /**
   * Destroy the form, removing it from DOM,
   * if attached.
   */
  destroy() {

    // destroy form services
    this.get('eventBus').fire('form.destroy');

    // destroy diagram services (e.g. EventBus)
    this.get('eventBus').fire('diagram.destroy');

    this._detach(false);
  }

  /**
   * Open a form schema with the given initial data.
   *
   * @param {Schema} schema
   * @param {Data} [data]
   *
   * @return Promise<{ warnings: Array<any> }>
   */
  importSchema(schema, data = {}) {
    return new Promise((resolve, reject) => {
      try {
        this.clear();

        const {
          schema: importedSchema,
          warnings
        } = this.get('importer').importSchema(schema);

        const initializedData = this._initializeFieldData(clone(data));

        this._setState({
          data: initializedData,
          errors: {},
          schema: importedSchema,
          initialData: clone(initializedData)
        });

        this._emit('import.done', { warnings });

        return resolve({ warnings });
      } catch (error) {
        this._emit('import.done', {
          error,
          warnings: error.warnings || []
        });

        return reject(error);
      }
    });
  }

  /**
   * Submit the form, triggering all field validations.
   *
   * @returns { { data: Data, errors: Errors } }
   */
  submit() {

    const {
      properties
    } = this._getState();

    if (properties.readOnly || properties.disabled) {
      throw new Error('form is read-only');
    }

    const data = this._getSubmitData();

    const errors = this.validate();
    const filteredErrors = this._applyConditions(errors, data);

    const result = {
      data,
      errors: filteredErrors
    };

    this._emit('submit', result);

    return result;
  }

  reset() {
    this._emit('reset');

    this._setState({
      data: clone(this._state.initialData),
      errors: {}
    });
  }

  /**
   * @returns {Errors}
   */
  validate() {
    const formFieldRegistry = this.get('formFieldRegistry'),
          pathRegistry = this.get('pathRegistry'),
          validator = this.get('validator');

    const { data } = this._getState();

    const errors = formFieldRegistry.getAll().reduce((errors, field) => {
      const {
        disabled
      } = field;

      if (disabled) {
        return errors;
      }

      const value = get(data, pathRegistry.getValuePath(field));

      const fieldErrors = validator.validateField(field, value);

      return set(errors, [ field.id ], fieldErrors.length ? fieldErrors : undefined);
    }, /** @type {Errors} */ ({}));

    this._setState({ errors });

    return errors;
  }

  /**
   * @param {Element|string} parentNode
   */
  attachTo(parentNode) {
    if (!parentNode) {
      throw new Error('parentNode required');
    }

    this.detach();

    if (isString(parentNode)) {
      parentNode = document.querySelector(parentNode);
    }

    const container = this._container;

    parentNode.appendChild(container);

    this._emit('attach');
  }

  detach() {
    this._detach();
  }

  /**
   * @private
   *
   * @param {boolean} [emit]
   */
  _detach(emit = true) {
    const container = this._container,
          parentNode = container.parentNode;

    if (!parentNode) {
      return;
    }

    if (emit) {
      this._emit('detach');
    }

    parentNode.removeChild(container);
  }

  /**
   * @param {FormProperty} property
   * @param {any} value
   */
  setProperty(property, value) {
    const properties = set(this._getState().properties, [ property ], value);

    this._setState({ properties });
  }

  /**
   * @param {FormEvent} type
   * @param {Function} handler
   */
  off(type, handler) {
    this.get('eventBus').off(type, handler);
  }

  /**
   * @private
   *
   * @param {FormOptions} options
   * @param {Element} container
   *
   * @returns {Injector}
   */
  _createInjector(options, container) {
    const {
      additionalModules = [],
      modules = this._getModules()
    } = options;

    const config = {
      renderer: {
        container
      }
    };

    return createInjector([
      { config: [ 'value', config ] },
      { form: [ 'value', this ] },
      core,
      ...modules,
      ...additionalModules
    ]);
  }

  /**
   * @private
   */
  _emit(type, data) {
    this.get('eventBus').fire(type, data);
  }

  /**
   * @internal
   *
   * @param { { add?: boolean, field: any, indexes: object, remove?: number, value?: any } } update
   */
  _update(update) {
    const {
      field,
      indexes,
      value
    } = update;

    const {
      data,
      errors
    } = this._getState();

    const validator = this.get('validator'),
          pathRegistry = this.get('pathRegistry');

    const fieldErrors = validator.validateField(field, value);

    const valuePath = pathRegistry.getValuePath(field, { indexes });

    set(data, valuePath, value);

    set(errors, [ field.id ], fieldErrors.length ? fieldErrors : undefined);

    this._setState({
      data: clone(data),
      errors: clone(errors)
    });
  }

  /**
   * @internal
   */
  _getState() {
    return this._state;
  }

  /**
   * @internal
   */
  _setState(state) {
    this._state = {
      ...this._state,
      ...state
    };

    this._emit('changed', this._getState());
  }

  /**
 * @internal
 */
  _getModules() {
    return [
      ExpressionLanguageModule,
      MarkdownModule,
      ViewerCommandsModule,
      RepeatRenderModule
    ];
  }

  /**
   * @internal
   */
  _onEvent(type, priority, handler) {
    this.get('eventBus').on(type, priority, handler);
  }

  /**
   * @internal
   */
  _getSubmitData() {
    const formFieldRegistry = this.get('formFieldRegistry');
    const formFields = this.get('formFields');
    const pathRegistry = this.get('pathRegistry');
    const formData = this._getState().data;

    function collectSubmitDataRecursively(submitData, formField, indexes = {}) {
      const { disabled, type } = formField;
      const { config: fieldConfig } = formFields.get(type);

      // (1) Process keyed fields
      if (!disabled && fieldConfig.keyed) {
        const valuePath = pathRegistry.getValuePath(formField, { indexes });
        const value = get(formData, valuePath);
        set(submitData, valuePath, value);
      }

      // (2) Process parents
      if (formField.components) {

        if (fieldConfig.repeatable && formField.isRepeating) {
          const valueData = get(formData, pathRegistry.getValuePath(formField, { indexes }));
          if (Array.isArray(valueData)) {
            valueData.forEach((_, index) => {
              formField.components.forEach((component) => {
                collectSubmitDataRecursively(submitData, component, { ...indexes, [formField.id]: index });
              });
            });
          }
          return;
        }

        // Recurse non-repeatable parents only across the children
        formField.components.forEach((component) => collectSubmitDataRecursively(submitData, component, indexes));
      }
    }

    const workingSubmitData = {};
    collectSubmitDataRecursively(workingSubmitData, formFieldRegistry.getForm());
    return this._applyConditions(workingSubmitData, formData);
  }

  /**
   * @internal
   */
  _applyConditions(toFilter, data) {
    const conditionChecker = this.get('conditionChecker');
    return conditionChecker.applyConditions(toFilter, data);
  }

  /**
   * @internal
   */
  _initializeFieldData(data) {
    const formFieldRegistry = this.get('formFieldRegistry');
    const formFields = this.get('formFields');
    const pathRegistry = this.get('pathRegistry');

    function initializeFieldDataRecursively(initializedData, formField, indexes = {}) {
      const { defaultValue, type, isRepeating } = formField;
      const { config: fieldConfig } = formFields.get(type);

      const valuePath = pathRegistry.getValuePath(formField, { indexes });
      let valueData = get(data, valuePath);

      // (1) Process keyed fields
      if (fieldConfig.keyed) {

        // (a) Retrieve and sanitize data from input
        if (!isUndefined(valueData) && fieldConfig.sanitizeValue) {
          valueData = fieldConfig.sanitizeValue({ formField, data, value: valueData });
        }

        // (b) Initialize field value in output data
        const initializedFieldValue = !isUndefined(valueData) ? valueData : (!isUndefined(defaultValue) ? defaultValue : fieldConfig.emptyValue);
        set(initializedData, valuePath, initializedFieldValue);
      }

      // (2) Process parents
      if (formField.components) {

        if (fieldConfig.repeatable && isRepeating) {

          // (a) Sanitize repeatable parents data if it is not an array
          if (!valueData || !Array.isArray(valueData)) {
            valueData = new Array(formField.defaultRepetitions || 0).fill().map(_ => ({})) || [];
          }

          // (b) Ensure all elements of the array are objects
          valueData = valueData.map((val) => isObject(val) ? val : {});

          // (c) Initialize field value in output data
          set(initializedData, valuePath, valueData);

          // (d) Recurse repeatable parents both across the indexes of repetition and the children
          valueData.forEach((_, index) => {
            formField.components.forEach(
              (component) => initializeFieldDataRecursively(initializedData, component, { ...indexes, [formField.id]: index })
            );
          });

          return;
        }

        // (c) Recurse non-repeatable parents only across the children
        formField.components.forEach((component) => initializeFieldDataRecursively(initializedData, component, indexes));
      }
    }

    const workingData = clone(data);
    initializeFieldDataRecursively(workingData, formFieldRegistry.getForm());
    return workingData;
  }

}
