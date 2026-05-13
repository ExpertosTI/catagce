import * as React from 'react';
import * as react_jsx_runtime from 'react/jsx-runtime';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
}
declare const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>;

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
}
declare const Input: React.ForwardRefExoticComponent<InputProps & React.RefAttributes<HTMLInputElement>>;

declare const Card: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => react_jsx_runtime.JSX.Element;
declare const CardTitle: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => react_jsx_runtime.JSX.Element;
declare const CardDescription: ({ className, children }: {
    className?: string;
    children: React.ReactNode;
}) => react_jsx_runtime.JSX.Element;

export { Button, type ButtonProps, Card, CardDescription, CardTitle, Input, type InputProps };
