import React, { Fragment } from 'react'

function Paginate(props) {
    const paginator = props.paginator || {}
    const total_pages = paginator.total_pages || 1
    const current_page = paginator.current_page || 1
    const next_page_url = paginator.next_page_url
    const previous_page_url = paginator.previous_page_url

    function onClickPage(e, page) {
        e.preventDefault();
        if (page >= 1 && page <= total_pages) {
            props.pagechanged(page)
        }
    }

    // Generate smart page numbers with ellipsis
    const getPageNumbers = () => {
        const pages = [];
        const showEllipsisLeft = current_page > 4;
        const showEllipsisRight = current_page < total_pages - 3;

        // Always show first page
        pages.push(1);

        // Show ellipsis or pages near start
        if (showEllipsisLeft) {
            pages.push('ellipsis-left');
        } else {
            // Show pages 2, 3 if we're near the start
            for (let i = 2; i <= Math.min(3, total_pages - 1); i++) {
                pages.push(i);
            }
        }

        // Show current page and neighbors (if not already shown)
        const startPage = Math.max(2, current_page - 1);
        const endPage = Math.min(total_pages - 1, current_page + 1);
        
        for (let i = startPage; i <= endPage; i++) {
            if (!pages.includes(i)) {
                pages.push(i);
            }
        }

        // Show ellipsis or pages near end
        if (showEllipsisRight) {
            pages.push('ellipsis-right');
        } else {
            // Show last few pages
            for (let i = Math.max(total_pages - 2, 2); i < total_pages; i++) {
                if (!pages.includes(i)) {
                    pages.push(i);
                }
            }
        }

        // Always show last page (if more than 1 page)
        if (total_pages > 1 && !pages.includes(total_pages)) {
            pages.push(total_pages);
        }

        return pages;
    };

    const pageNumbers = getPageNumbers();

    return (
        <Fragment>
            <div className="d-flex justify-content-between align-items-center mb-3">
                <div className="float-left">
                    {/* Showing entries info */}
                </div>

                <nav aria-label="Page navigation">
                    <ul className="pagination pagination-sm justify-content-end mb-0" style={{ gap: '2px' }}>
                        {/* First page button (<<) */}
                        <li className={`page-item ${!previous_page_url ? 'disabled' : ''}`}>
                            <a
                                href="#0"
                                className="page-link"
                                onClick={(e) => onClickPage(e, 1)}
                                aria-label="First"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: !previous_page_url ? '#ccc' : '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px',
                                    cursor: !previous_page_url ? 'not-allowed' : 'pointer'
                                }}
                            >
                                &laquo;
                            </a>
                        </li>

                        {/* Previous page button (<) */}
                        <li className={`page-item ${!previous_page_url ? 'disabled' : ''}`}>
                            <a
                                href="#0"
                                className="page-link"
                                onClick={(e) => onClickPage(e, current_page - 1)}
                                aria-label="Previous"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: !previous_page_url ? '#ccc' : '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px',
                                    cursor: !previous_page_url ? 'not-allowed' : 'pointer'
                                }}
                            >
                                &lsaquo;
                            </a>
                        </li>

                        {/* Page numbers with ellipsis */}
                        {pageNumbers.map((pageNumber, index) => {
                            if (typeof pageNumber === 'string' && pageNumber.startsWith('ellipsis')) {
                                return (
                                    <li className="page-item disabled" key={pageNumber}>
                                        <span
                                            className="page-link"
                                            style={{
                                                border: 'none',
                                                background: 'transparent',
                                                color: '#6c757d',
                                                fontSize: '15px',
                                                lineHeight: '1',
                                                padding: '2px 6px',
                                                height: '20px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                cursor: 'default'
                                            }}
                                        >
                                            ...
                                        </span>
                                    </li>
                                );
                            }

                            return (
                                <li
                                    className={`page-item ${current_page === pageNumber ? 'active' : ''}`}
                                    key={`page-${pageNumber}`}
                                >
                                    <a
                                        className="page-link"
                                        href="#0"
                                        onClick={(e) => onClickPage(e, pageNumber)}
                                        style={{
                                            border: current_page === pageNumber ? '1px solid rgb(150, 178, 209)' : '1px solid #dee2e6',
                                            background: current_page === pageNumber ? '#007bff' : '#fff',
                                            color: current_page === pageNumber ? '#fff' : '#007bff',
                                            minWidth: '20px',
                                            height: '20px',
                                            padding: '2px 6px',
                                            fontSize: '15px',
                                            lineHeight: '1',
                                            textAlign: 'center',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            borderRadius: '1.5px',
                                            outline: 'none',
                                            boxShadow: 'none',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {pageNumber}
                                    </a>
                                </li>
                            );
                        })}

                        {/* Next page button (>) */}
                        <li className={`page-item ${!next_page_url ? 'disabled' : ''}`}>
                            <a
                                href="#0"
                                className="page-link"
                                onClick={(e) => onClickPage(e, current_page + 1)}
                                aria-label="Next"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: !next_page_url ? '#ccc' : '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px',
                                    cursor: !next_page_url ? 'not-allowed' : 'pointer'
                                }}
                            >
                                &rsaquo;
                            </a>
                        </li>

                        {/* Last page button (>>) */}
                        <li className={`page-item ${!next_page_url ? 'disabled' : ''}`}>
                            <a
                                href="#0"
                                className="page-link"
                                onClick={(e) => onClickPage(e, total_pages)}
                                aria-label="Last"
                                style={{
                                    border: 'none',
                                    background: 'transparent',
                                    color: !next_page_url ? '#ccc' : '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px',
                                    cursor: !next_page_url ? 'not-allowed' : 'pointer'
                                }}
                            >
                                &raquo;
                            </a>
                        </li>
                    </ul>
                </nav>
            </div>
        </Fragment>
    )
}

export default Paginate