import { get } from 'min-dash';
import { ToggleSwitchEntry, isToggleSwitchEntryEdited } from '@bpmn-io/properties-panel';

export default function simpleBoolEntryFactory(options) {
  const {
    id,
    label,
    description,
    path,
    props
  } = options;

  const {
    editField,
    field
  } = props;

  return {
    id,
    label,
    path,
    field,
    editField,
    description,
    component: SimpleBoolComponent,
    isEdited: isToggleSwitchEntryEdited
  };
}

const SimpleBoolComponent = (props) => {
  const {
    id,
    label,
    path,
    field,
    editField,
    description
  } = props;

  const getValue = () => get(field, path, '');

  const setValue = (value) => editField(field, path, value || false);

  return ToggleSwitchEntry({
    element: field,
    getValue,
    id,
    label,
    setValue,
    inline: true,
    description
  });
};
