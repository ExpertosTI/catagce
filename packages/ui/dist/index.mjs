// src/components/Button.tsx
import * as React from "react";
import { jsx } from "react/jsx-runtime";
var Button = React.forwardRef(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    const baseStyles = "inline-flex items-center justify-center rounded-xl font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";
    const variants = {
      primary: "bg-white text-black hover:bg-gray-100 focus:ring-gray-500",
      secondary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
      outline: "border border-white/10 bg-transparent hover:bg-white/5 text-white",
      ghost: "bg-transparent hover:bg-white/5 text-gray-400 hover:text-white"
    };
    const sizes = {
      sm: "h-9 px-3 text-sm",
      md: "h-11 px-6",
      lg: "h-14 px-8 text-lg"
    };
    return /* @__PURE__ */ jsx(
      "button",
      {
        ref,
        className: `${baseStyles} ${variants[variant] || ""} ${sizes[size] || ""} ${className || ""}`,
        ...props
      }
    );
  }
);
Button.displayName = "Button";

// src/components/Input.tsx
import * as React2 from "react";
import { jsx as jsx2, jsxs } from "react/jsx-runtime";
var Input = React2.forwardRef(
  ({ className, label, error, ...props }, ref) => {
    return /* @__PURE__ */ jsxs("div", { className: "w-full space-y-1.5", children: [
      label && /* @__PURE__ */ jsx2("label", { className: "text-sm font-medium text-gray-400", children: label }),
      /* @__PURE__ */ jsx2(
        "input",
        {
          ref,
          className: `
            flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm 
            placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 
            focus:border-blue-500 transition-all disabled:cursor-not-allowed disabled:opacity-50
            ${error ? "border-red-500 focus:border-red-500" : ""}
            ${className || ""}
          `,
          ...props
        }
      ),
      error && /* @__PURE__ */ jsx2("p", { className: "text-xs text-red-500 font-medium", children: error })
    ] });
  }
);
Input.displayName = "Input";

// src/components/Card.tsx
import { jsx as jsx3 } from "react/jsx-runtime";
var Card = ({ className, children }) => /* @__PURE__ */ jsx3("div", { className: `rounded-3xl border border-white/10 bg-white/5 p-6 ${className}`, children });
var CardTitle = ({ className, children }) => /* @__PURE__ */ jsx3("h3", { className: `text-lg font-bold leading-none tracking-tight ${className}`, children });
var CardDescription = ({ className, children }) => /* @__PURE__ */ jsx3("p", { className: `text-sm text-gray-400 ${className}`, children });
export {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Input
};
