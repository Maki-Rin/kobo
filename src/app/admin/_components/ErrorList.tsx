export default function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div role='alert' className='rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900'>
      <ul className='list-disc space-y-1 pl-5'>
        {errors.map((error) => (
          <li key={error}>{error}</li>
        ))}
      </ul>
    </div>
  );
}
