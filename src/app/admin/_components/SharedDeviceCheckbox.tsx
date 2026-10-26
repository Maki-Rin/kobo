export default function SharedDeviceCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className='flex items-start gap-2 text-sm'>
      <input
        type='checkbox'
        className='mt-1'
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span>
        共有の端末（工房のPCなど）
        <span className='block text-slate-500'>ブラウザを閉じるか、2時間たつとログアウトします</span>
      </span>
    </label>
  );
}
