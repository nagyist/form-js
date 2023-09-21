import CloseSvg from '../../render/components/icons/Close.svg';

export default class RepeatRenderManager {

  constructor(formFields, formFieldRegistry) {
    this._formFields = formFields;
    this._formFieldRegistry = formFieldRegistry;
    this.RepeatInfo = this.RepeatInfo.bind(this);
  }

  /**
   * Checks whether a field should be repeatable.
   *
   * @param {string} id - The id of the field to check
   * @returns {boolean} - True if repeatable, false otherwise
   */
  isFieldRepeating(id) {

    if (!id) {
      return false;
    }

    const formField = this._formFieldRegistry.get(id);
    const formFieldDefinition = this._formFields.get(formField.type);
    return formFieldDefinition.config.repeatable && formField.isRepeating;
  }

  RepeatInfo() {
    return <div className="fjs-editor-repeat-render-info"><CloseSvg /><span>Repeatable</span></div>;
  }

}

RepeatRenderManager.$inject = [ 'formFields', 'formFieldRegistry' ];