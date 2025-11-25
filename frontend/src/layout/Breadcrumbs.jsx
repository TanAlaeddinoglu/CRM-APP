// src/layout/Breadcrumbs.jsx
import { useLocation } from "react-router-dom";

export default function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname.split("/").filter(Boolean);

  if (parts.length === 0) return null;

  return (
    <div className="breadcrumbs">
      {parts.map((p, index) => (
        <span key={index}>
          {p}
          {index < parts.length - 1 && " / "}
        </span>
      ))}
    </div>
  );
}

// // src/layout/Breadcrumbs.jsx
// export default function Breadcrumbs() {
//   return (
//     <div className="breadcrumbs">
//       Breadcrumb Area
//     </div>
//   );
// }
