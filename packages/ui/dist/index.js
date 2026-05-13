"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  Button: () => Button,
  Card: () => Card,
  CardDescription: () => CardDescription,
  CardTitle: () => CardTitle,
  Input: () => Input
});
module.exports = __toCommonJS(index_exports);

// src/components/Button.tsx
var React = __toESM(require("react"));
var import_jsx_runtime = require("react/jsx-runtime");
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
    return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
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
var React2 = __toESM(require("react"));
var import_jsx_runtime2 = require("react/jsx-runtime");
var Input = React2.forwardRef(
  ({ className, label, error, ...props }, ref) => {
    return /* @__PURE__ */ (0, import_jsx_runtime2.jsxs)("div", { className: "w-full space-y-1.5", children: [
      label && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("label", { className: "text-sm font-medium text-gray-400", children: label }),
      /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
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
      error && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("p", { className: "text-xs text-red-500 font-medium", children: error })
    ] });
  }
);
Input.displayName = "Input";

// src/components/Card.tsx
var import_jsx_runtime3 = require("react/jsx-runtime");
var Card = ({ className, children }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("div", { className: `rounded-3xl border border-white/10 bg-white/5 p-6 ${className}`, children });
var CardTitle = ({ className, children }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("h3", { className: `text-lg font-bold leading-none tracking-tight ${className}`, children });
var CardDescription = ({ className, children }) => /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("p", { className: `text-sm text-gray-400 ${className}`, children });
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Button,
  Card,
  CardDescription,
  CardTitle,
  Input
});
