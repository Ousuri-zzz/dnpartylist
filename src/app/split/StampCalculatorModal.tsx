import { Fragment, useState } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface StampCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function StampCalculatorModal({ isOpen, onClose }: StampCalculatorModalProps) {
  const [stamps, setStamps] = useState('');
  const [goldRate, setGoldRate] = useState('');
  const [result, setResult] = useState<{ cash: string; gold: string }>({ cash: '', gold: '' });

  const calculateFromStamps = (stampsValue: string, goldRateValue: string) => {
    const stampsNum = parseFloat(stampsValue) || 0;
    const goldRateNum = parseFloat(goldRateValue) || 0;

    if (stampsNum && goldRateNum) {
      const cashValue = stampsNum * 35; // 1 แสตมป์ = 35 Cash
      const bahtValue = cashValue / 39; // 39 Cash = 1 บาท
      const goldValue = bahtValue / goldRateNum; // เงินบาท ÷ เรทราคา Gold

      setResult({
        cash: cashValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        gold: goldValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
      });
    } else {
      setResult({ cash: '', gold: '' });
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="div"
                  className="flex items-center justify-between mb-4"
                >
                  <h3 className="text-lg font-medium leading-6 text-yellow-600">
                    คำนวณ Gold จากแสตมป์
                  </h3>
                  <button
                    type="button"
                    className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none"
                    onClick={onClose}
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <div className="mt-2 space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-yellow-600 mb-1">
                      จำนวนแสตมป์
                    </label>
                    <input
                      type="number"
                      value={stamps}
                      placeholder="กรอกจำนวนแสตมป์"
                      className="w-full rounded-xl border border-yellow-200 px-4 py-2 focus:ring-2 focus:ring-yellow-100 transition bg-white text-gray-700 placeholder-gray-400"
                      onChange={(e) => {
                        setStamps(e.target.value);
                        calculateFromStamps(e.target.value, goldRate);
                      }}
                    />
                    <div className="text-xs text-yellow-600 mt-1">* 1 แสตมป์ = 35 Cash</div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-yellow-600 mb-1">
                      เรท Gold (บาทต่อ 1 Gold)
                    </label>
                    <input
                      type="number"
                      value={goldRate}
                      placeholder="เช่น 0.6 (หมายถึง 0.6 บาท = 1 Gold)"
                      className="w-full rounded-xl border border-yellow-200 px-4 py-2 focus:ring-2 focus:ring-yellow-100 transition bg-white text-gray-700 placeholder-gray-400"
                      onChange={(e) => {
                        setGoldRate(e.target.value);
                        calculateFromStamps(stamps, e.target.value);
                      }}
                    />
                    <div className="text-xs text-yellow-600 mt-1">* เช่น 0.6 บาท = 1 Gold, 1.2 บาท = 1 Gold</div>
                  </div>

                  {result.cash && result.gold && (
                    <div className="mt-4 space-y-2">
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-white border border-yellow-100">
                        <span className="text-yellow-700 font-semibold flex-1">Cash ที่ได้:</span>
                        <span className="font-extrabold text-yellow-600 text-xl">{result.cash}</span>
                        <span className="text-yellow-700 font-semibold">Cash</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-gradient-to-r from-yellow-50 to-white border border-yellow-100">
                        <span className="text-yellow-700 font-semibold flex-1">Gold ที่ได้:</span>
                        <span className="font-extrabold text-yellow-600 text-xl">{result.gold}</span>
                        <span className="text-yellow-700 font-semibold">Gold</span>
                      </div>
                    </div>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 