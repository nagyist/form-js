import { Text } from '@bpmn-io/form-js-viewer';
import { editorFormFieldClasses } from '../Util';
import { useService } from '../../hooks';

import { iconsByType } from '../icons';

export default function EditorText(props) {

  const { type, text = '' } = props.field;

  const Icon = iconsByType('text');

  const templating = useService('templating', false);
  const expressionLanguage = useService('expressionLanguage', false);

  if (!text) {
    return <div class={ editorFormFieldClasses(type) }>
      <div class="fjs-form-field-placeholder"><Icon viewBox="0 0 54 54" />Text view is empty</div>
    </div>;
  }

  if (expressionLanguage && expressionLanguage.isExpression(text)) {
    return <div class={ editorFormFieldClasses(type) }>
      <div class="fjs-form-field-placeholder"><Icon viewBox="0 0 54 54" />Text view is populated by an expression</div>
    </div>;
  }

  if (templating && templating.isTemplate(text)) {
    return <div class={ editorFormFieldClasses(type) }>
      <div class="fjs-form-field-placeholder"><Icon viewBox="0 0 54 54" />Text view is templated</div>
    </div>;
  }

  return <Text { ...{ ...props, disableLinks: true } } />;
}

EditorText.create = Text.create;
EditorText.type = Text.type;
EditorText.keyed = Text.keyed;
