import { useContext } from 'preact/hooks';

import { FormContext } from '../../context';

import { useExpressionEvaluation } from '../../hooks';

import {
  formFieldClasses,
  prefixId,
  safeImageSource
} from '../Util';

import ImagePlaceholder from './icons/ImagePlaceholder.svg';

const type = 'image';


export default function Image(props) {
  const {
    field
  } = props;

  const {
    alt,
    id,
    source
  } = field;

  const safeSource = safeImageSource(useExpressionEvaluation(source));
  const altText = useExpressionEvaluation(alt);

  const { formId } = useContext(FormContext);

  return <div class={ formFieldClasses(type) }>
    <div class="fjs-image-container">
      {
        safeSource &&
        <img
          alt={ altText }
          src={ safeSource }
          class="fjs-image"
          id={ prefixId(id, formId) } />
      }
      { !safeSource &&
        <div class="fjs-image-placeholder">
          <ImagePlaceholder alt="This is an image placeholder" />
        </div>
      }
    </div>
  </div>;
}

Image.create = (options = {}) => ({
  ...options
});

Image.type = type;
Image.keyed = false;
Image.label = 'Image view';
Image.group = 'presentation';