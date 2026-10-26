import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import * as PortOne from '@portone/browser-sdk/v2';
import { errorMessage } from '../api/client';
import { supportApi } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import ErrorText from '../components/ErrorText';

const AMOUNTS = [3000, 6000, 9000];

export default function SupportPage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const [amount, setAmount] = useState(3000);
  const [created, setCreated] = useState(null);
  const [notice, setNotice] = useState(null);
  const [step, setStep] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const redirectHandledRef = useRef(false);

  const confirm = async (paymentId) => {
    setStep(`결제 확인 요청: POST /api/supports/${paymentId}/confirm`);
    setResult(await supportApi.confirm(paymentId));
    setStep('완료');
  };

  // 모바일 등에서 redirectUrl로 돌아온 경우: ?paymentId=...&code=...&message=...
  useEffect(() => {
    const paymentId = params.get('paymentId');
    if (!paymentId || redirectHandledRef.current || !user) return;
    redirectHandledRef.current = true;
    const code = params.get('code');
    const message = params.get('message');
    setParams({}, { replace: true });

    if (code) {
      setError(`결제 실패/취소 (${code}): ${message || ''}`);
      return;
    }
    confirm(paymentId).catch((e) => setError(errorMessage(e)));
  }, [params, setParams, user]);

  const pay = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    setResult(null);
    setCreated(null);
    try {
      setStep('후원 생성: POST /api/supports');
      const support = await supportApi.create(amount);
      setCreated(support);

      if (!support?.storeId || !support?.channelKey) {
        setNotice(
          '백엔드 응답의 storeId 또는 channelKey가 비어 있어 결제창을 열 수 없습니다. ' +
            '백엔드에 PORTONE_STORE_ID, PORTONE_CHANNEL_KEY 환경변수를 설정하세요.',
        );
        setStep(null);
        return;
      }

      setStep('PortOne 결제창 진행 중…');
      const response = await PortOne.requestPayment({
        storeId: support.storeId,
        channelKey: support.channelKey,
        paymentId: support.paymentId,
        orderName: support.orderName,
        totalAmount: support.amount,
        currency: 'KRW',
        payMethod: 'CARD',
        redirectUrl: `${window.location.origin}/support`,
      });

      if (!response) {
        setError('결제창 응답이 없습니다. (리다이렉트 방식으로 진행되었을 수 있습니다)');
        setStep(null);
        return;
      }
      if (response.code !== undefined) {
        setError(`결제 실패/취소 (${response.code}): ${response.message || ''}`);
        setStep(null);
        return;
      }

      await confirm(response.paymentId || support.paymentId);
    } catch (e) {
      setError(errorMessage(e));
      setStep(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h1>개발자 후원</h1>
      {!user && <p className="muted">후원은 로그인 후 이용할 수 있습니다. (비로그인 상태로 요청하면 401 확인 가능)</p>}

      <div className="card">
        <div className="row">
          {AMOUNTS.map((a) => (
            <label key={a}>
              <input type="radio" name="amount" checked={amount === a} onChange={() => setAmount(a)} />{' '}
              {a.toLocaleString()}원 (커피 {a / 3000}잔)
            </label>
          ))}
        </div>
        <div className="row" style={{ marginTop: 12 }}>
          <button className="primary" disabled={busy} onClick={pay}>
            후원하기
          </button>
        </div>
      </div>

      {step && <p className="muted">{step}</p>}
      {created && (
        <div className="card">
          <div className="muted">후원 생성 응답</div>
          <pre>{JSON.stringify(created, null, 2)}</pre>
        </div>
      )}
      {notice && <p className="error">{notice}</p>}
      <ErrorText error={error} />
      {result && (
        <div className="card">
          <h3 className={result.result === 'COMPLETED' ? 'success' : result.result === 'FAILED' ? 'error' : ''}>
            {result.result} - {result.message}
          </h3>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
