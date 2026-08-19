import { isIcon } from '../lib/isIcon';

export default function SafeIcon({ icon: Icon, ...props }) {
  if (!isIcon(Icon)) return null;
  return <Icon {...props} />;
}
