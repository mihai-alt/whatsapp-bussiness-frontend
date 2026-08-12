function loadRazorpayScript() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window unavailable'));
  if (window.Razorpay) return Promise.resolve(window.Razorpay);

  return new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-razorpay-checkout]');
    if (existing) {
      existing.addEventListener('load', () => resolve(window.Razorpay));
      existing.addEventListener('error', () => reject(new Error('Failed to load Razorpay')));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.dataset.razorpayCheckout = '1';
    script.onload = () => resolve(window.Razorpay);
    script.onerror = () => reject(new Error('Failed to load Razorpay Checkout'));
    document.body.appendChild(script);
  });
}

export async function openRazorpayCheckout({
  keyId,
  orderId,
  amount,
  currency = 'INR',
  name = 'WhatsApp Business BSP',
  description = 'Wallet Recharge',
  prefill = {},
  notes = {},
}) {
  const Razorpay = await loadRazorpayScript();
  return new Promise((resolve, reject) => {
    const rzp = new Razorpay({
      key: keyId,
      amount,
      currency,
      name,
      description,
      order_id: orderId,
      prefill,
      notes,
      theme: { color: '#25D366' },
      handler(response) {
        resolve({ status: 'paid', response });
      },
      modal: {
        ondismiss() {
          resolve({ status: 'dismissed' });
        },
      },
    });
    rzp.on('payment.failed', (response) => {
      resolve({ status: 'failed', response: response?.error || response });
    });
    try {
      rzp.open();
    } catch (err) {
      reject(err);
    }
  });
}
