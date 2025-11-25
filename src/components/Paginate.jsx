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
                                    color: '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px'
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
                                    color: '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px'
                                }}
                            >
                                &lsaquo;
                            </a>
                        </li>

                        {/* Page numbers */}
                        {Array.from({ length: total_pages }, (_, i) => i + 1).map((pageNumber) => (
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
                                        boxShadow: 'none'
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
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px'
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
                                    color: '#6c757d',
                                    fontSize: '15px',
                                    lineHeight: '1',
                                    outline: 'none',
                                    boxShadow: 'none',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    padding: '2px 6px',
                                    height: '20px'
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