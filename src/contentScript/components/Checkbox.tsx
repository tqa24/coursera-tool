export default function Checkbox({ id, checked, children, onChange }: any) {
  return (
    <div className="flex items-center mb-4">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded dark:bg-gray-700 dark:border-gray-600"
      />
      <label htmlFor={id} className="ms-2 text-sm font-medium text-gray-900 !mb-0">
        {children}
      </label>
    </div>
  );
}
