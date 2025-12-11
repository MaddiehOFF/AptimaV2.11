
import React from 'react';

interface WidgetWrapperProps {
    children: React.ReactNode;
    title?: string;
    className?: string; // Allow custom classes (e.g. col-span)
}

export const WidgetWrapper: React.FC<WidgetWrapperProps> = ({ children, title, className = '' }) => {
    return (
        <div className={`bg-white dark:bg-sushi-dark rounded-xl border border-gray-200 dark:border-white/5 shadow-sm overflow-hidden animate-fade-in ${className}`}>
            {title && (
                <div className="px-6 py-4 border-b border-gray-200 dark:border-white/5">
                    <h3 className="font-serif text-lg text-gray-900 dark:text-white">{title}</h3>
                </div>
            )}
            <div className="p-0 h-full">
                {children}
            </div>
        </div>
    );
};
