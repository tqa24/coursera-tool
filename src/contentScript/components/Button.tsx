import { LoadingIcon } from './Icon';

export const Button = ({ className, children, onClick, isLoading, title, icon }: any) => {
  return (
    <button
      disabled={isLoading}
      title={title}
      onClick={onClick}
      className={`flex-shrink-0 inline-flex items-center py-2 px-3 text-sm justify-center font-medium text-center text-white bg-blue-700 rounded-lg hover:bg-blue-800 focus:ring-0 focus:outline-none focus:ring-blue-300 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800 border border-blue-700 dark:border-blue-600 hover:border-blue-800 dark:hover:border-blue-700 gap-2 select-none disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-400 disabled:dark:bg-zinc-300 disabled:dark:text-gray-500 disabled:dark:border-gray-800 ${className}`}
    >
      {isLoading ? <LoadingIcon /> : icon}
      {children}
    </button>
  );
};
