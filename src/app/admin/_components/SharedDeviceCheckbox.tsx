export default function SharedDeviceCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className='flex cursor-pointer items-start gap-2.5 rounded-md border border-slate-200 px-3.5 py-3 text-sm hover:bg-slate-50'>
      <input
        type='checkbox'
        className='mt-0.5 size-4 accent-slate-900'
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        <span className='font-medium'>共有の端末（工房のPCなど）</span>
        <span className='mt-0.5 block text-xs text-slate-500'>ブラウザを閉じるか、2時間たつとログアウトします</span>
      </span>
    </label>
  );
}
