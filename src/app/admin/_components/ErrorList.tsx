export default function ErrorList({ errors }: { errors: string[] }) {
  if (errors.length === 0) return null;
  return (
    <div role='alert' className='rounded-md border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-900'>
      {errors.length === 1 ? (
        <p>{errors[0]}</p>
      ) : (
        <ul className='list-disc space-y-1 pl-5'>
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
