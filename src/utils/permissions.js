export const hasPermission = (perm) => {
    const permissions = JSON.parse(localStorage.getItem("permissions")) || [];
    return permissions.includes(perm);
};