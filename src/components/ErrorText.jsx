import { errorMessage } from '../api/client';

export default function ErrorText({ error }) {
  if (!error) return null;
  return <p className="error">{typeof error === 'string' ? error : errorMessage(error)}</p>;
}
