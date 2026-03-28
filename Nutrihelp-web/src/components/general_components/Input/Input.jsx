import React from "react";
import "./Input.css";

const Input = (props) => {
  return (
    <div className="input-div">
      <p className="label">{props.label}</p>

      <input
        className={`border-1 ${
          props.darkMode && "bg-gray-700 text-white font-semibold"
        }`}
        name={props.name}
        type={props.type}
        placeholder={props.placeholder}
        onChange={props.onChange}
        value={props.value}
      />
    </div>
  );
};

export default Input;
