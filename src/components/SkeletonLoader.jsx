// SkeletonLoader.jsx
import React from 'react';

const SkeletonLoader = ({ type = 'table', count = 5, columns = 3 }) => {
  if (type === 'table') {
    return Array.from({ length: count }).map((_, index) => (
      <tr key={`skeleton-${index}`} className="align-middle">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <td key={`skeleton-${index}-${colIndex}`} className="py-1 px-3">
            <div 
              className="skeleton-item"
              style={{ 
                background: '#eee', 
                height: '20px', 
                borderRadius: '4px', 
                animation: 'pulse 1.5s infinite' 
              }}
            ></div>
          </td>
        ))}
      </tr>
    ));
  }

  if (type === 'card') {
    return Array.from({ length: count }).map((_, index) => (
      <div key={`skeleton-card-${index}`} className="skeleton-card">
        <div 
          className="skeleton-item"
          style={{ 
            background: '#eee', 
            height: '100px', 
            borderRadius: '8px', 
            animation: 'pulse 1.5s infinite',
            marginBottom: '10px'
          }}
        ></div>
      </div>
    ));
  }

  if (type === 'text') {
    return Array.from({ length: count }).map((_, index) => (
      <div 
        key={`skeleton-text-${index}`}
        className="skeleton-item"
        style={{ 
          background: '#eee', 
          height: '16px', 
          borderRadius: '4px', 
          animation: 'pulse 1.5s infinite',
          marginBottom: '8px',
          width: index % 2 === 0 ? '80%' : '60%'
        }}
      ></div>
    ));
  }

  if (type === 'filter') {
    return Array.from({ length: count }).map((_, index) => (
      <div 
        key={`skeleton-filter-${index}`}
        className="skeleton-item"
        style={{ 
          background: '#eee', 
          height: '32px', 
          borderRadius: '4px', 
          animation: 'pulse 1.5s infinite',
          marginBottom: '8px'
        }}
      ></div>
    ));
  }

  return null;
};

export default SkeletonLoader;