import React, { Fragment, useState } from 'react'

function Paginate(props) {
    const paginator = props.paginator || {}
    const total_pages = paginator.total_pages || 1
    const current_page = paginator.current_page || 1
    const next_page_url = paginator.next_page_url
    const previous_page_url = paginator.previous_page_url

    const [goToPage, setGoToPage] = useState('')

    function onClickPage(e, page) {
        e.preventDefault();
        if (page >= 1 && page <= total_pages) {
            props.pagechanged(page)
        }
    }

    function handleGoToPage(e) {
        e.preventDefault();
        const pageNum = parseInt(goToPage);
        if (pageNum >= 1 && pageNum <= total_pages) {
            props.pagechanged(pageNum);
            setGoToPage('');
        }
    }

    // Generate visible page numbers (show up to 6 pages)
    const getPageNumbers = () => {
        const pages = [];
        const maxVisible = 6;
        
        if (total_pages <= maxVisible) {
            // Show all pages if total is less than or equal to max visible
            for (let i = 1; i <= total_pages; i++) {
                pages.push(i);
            }
        } else {
            // Show pages around current page
            let startPage = Math.max(1, current_page - 2);
            let endPage = Math.min(total_pages, startPage + maxVisible - 1);
            
            // Adjust start if we're near the end
            if (endPage - startPage < maxVisible - 1) {
                startPage = Math.max(1, endPage - maxVisible + 1);
            }
            
            for (let i = startPage; i <= endPage; i++) {
                pages.push(i);
            }
        }
        
        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <Fragment>
            <div className="d-flex justify-content-end align-items-center mb-3">
                <nav aria-label="Page navigation">
                    <ul className="pagination pagination-sm justify-content-end mb-0" style={{ gap: '3px', margin: 0 }}>
                        {/* Previous page button (<) */}
                        <li className={`page-item ${!previous_page_url ? 'disabled' : ''}`}>
                            <a
                                href="#0"
                                className="page-link"
                                onClick={(e) => onClickPage(e, current_page - 1)}
                                aria-label="Previous"
                                style={{
                                    border: '1px solid #dee2e6',
                                    background: '#fff',
                                    color: !previous_page_url ? '#ccc' : '#6c757d',
                                    fontSize: '11px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px 6px',
                                    height: '24px',
                                    minWidth: '24px',
                                    borderRadius: '3px',
                                    cursor: !previous_page_url ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (previous_page_url) {
                                        e.target.style.borderColor = '#007bff';
                                        e.target.style.color = '#007bff';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (previous_page_url) {
                                        e.target.style.borderColor = '#dee2e6';
                                        e.target.style.color = '#6c757d';
                                    }
                                }}
                            >
                                &lt;
                            </a>
                        </li>

                        {/* Page numbers */}
                        {pageNumbers.map((pageNumber) => (
                            <li
                                className={`page-item ${current_page === pageNumber ? 'active' : ''}`}
                                key={`page-${pageNumber}`}
                            >
                                <a
                                    className="page-link"
                                    href="#0"
                                    onClick={(e) => onClickPage(e, pageNumber)}
                                    style={{
                                        border: current_page === pageNumber ? '1px solid #007bff' : '1px solid #dee2e6',
                                        background: current_page === pageNumber ? '#007bff' : '#fff',
                                        color: current_page === pageNumber ? '#fff' : '#6c757d',
                                        minWidth: '24px',
                                        height: '24px',
                                        padding: '3px 6px',
                                        fontSize: '11px',
                                        fontWeight: current_page === pageNumber ? '600' : '400',
                                        lineHeight: '1',
                                        textAlign: 'center',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        borderRadius: '3px',
                                        outline: 'none',
                                        boxShadow: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                    onMouseEnter={(e) => {
                                        if (current_page !== pageNumber) {
                                            e.target.style.borderColor = '#007bff';
                                            e.target.style.color = '#007bff';
                                        }
                                    }}
                                    onMouseLeave={(e) => {
                                        if (current_page !== pageNumber) {
                                            e.target.style.borderColor = '#dee2e6';
                                            e.target.style.color = '#6c757d';
                                        }
                                    }}
                                >
                                    {pageNumber}
                                </a>
                            </li>
                        ))}

                        {/* Next page button (>) */}
                        <li className={`page-item ${!next_page_url ? 'disabled' : ''}`}>
                            <a
                                href="#0"
                                className="page-link"
                                onClick={(e) => onClickPage(e, current_page + 1)}
                                aria-label="Next"
                                style={{
                                    border: '1px solid #dee2e6',
                                    background: '#fff',
                                    color: !next_page_url ? '#ccc' : '#6c757d',
                                    fontSize: '11px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '3px 6px',
                                    height: '24px',
                                    minWidth: '24px',
                                    borderRadius: '3px',
                                    cursor: !next_page_url ? 'not-allowed' : 'pointer',
                                    transition: 'all 0.2s'
                                }}
                                onMouseEnter={(e) => {
                                    if (next_page_url) {
                                        e.target.style.borderColor = '#007bff';
                                        e.target.style.color = '#007bff';
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (next_page_url) {
                                        e.target.style.borderColor = '#dee2e6';
                                        e.target.style.color = '#6c757d';
                                    }
                                }}
                            >
                                &gt;
                            </a>
                        </li>

                        {/* Go to page input */}
                        <li className="page-item" style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '3px' }}>
                            <span style={{
                                fontSize: '11px',
                                color: '#6c757d',
                                whiteSpace: 'nowrap'
                            }}>
                                Go to
                            </span>
                            <form onSubmit={handleGoToPage} style={{ margin: 0 }}>
                                <input
                                    type="number"
                                    min="1"
                                    max={total_pages}
                                    value={goToPage}
                                    onChange={(e) => setGoToPage(e.target.value)}
                                    placeholder=""
                                    style={{
                                        width: '38px',
                                        height: '24px',
                                        border: '1px solid #dee2e6',
                                        borderRadius: '3px',
                                        padding: '3px 4px',
                                        fontSize: '11px',
                                        textAlign: 'center',
                                        outline: 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onFocus={(e) => {
                                        e.target.style.borderColor = '#007bff';
                                        e.target.style.boxShadow = '0 0 0 0.15rem rgba(0,123,255,.2)';
                                    }}
                                    onBlur={(e) => {
                                        e.target.style.borderColor = '#dee2e6';
                                        e.target.style.boxShadow = 'none';
                                    }}
                                />
                            </form>
                        </li>
                    </ul>
                </nav>
            </div>
        </Fragment>
    )
}

export default Paginate