/**
 * Note Handler — catatan dan to-do list
 * 
 * @author Tama El Pablo
 */

const {
    createNote: dbCreateNote,
    getUserNotes: dbGetUserNotes,
    searchNotes: dbSearchNotes,
    updateNoteStatus: dbUpdateNoteStatus,
    deleteNote: dbDeleteNote,
} = require('./database');

/**
 * Buat catatan baru
 */
const createNote = (userId, title, content) => {
    if (!content && !title) return { success: false, error: 'Isi catatan ga boleh kosong bro' };
    const result = dbCreateNote(userId, 'note', title || 'Catatan', content || title);
    return { success: true, id: result.id, message: `catatan "${title || 'Catatan'}" udah disimpan ✅` };
};

/**
 * Buat todo baru
 */
const createTodo = (userId, title) => {
    if (!title) return { success: false, error: 'Todo nya apa bro? tulis dong' };
    const result = dbCreateNote(userId, 'todo', title, title);
    return { success: true, id: result.id, message: `todo "${title}" udah ditambah ✅` };
};

/**
 * List semua catatan
 */
const listNotes = (userId) => {
    const notes = dbGetUserNotes(userId, 'note');
    if (!notes.length) return 'belum ada catatan bro 📝';
    return formatNoteList(notes);
};

/**
 * List semua todo
 */
const listTodos = (userId) => {
    const todos = dbGetUserNotes(userId, 'todo');
    if (!todos.length) return 'belum ada todo bro ✍️';
    return formatTodoList(todos);
};

/**
 * Toggle status todo
 */
const toggleTodo = (userId, todoId) => {
    const todos = dbGetUserNotes(userId, 'todo');
    const todo = todos.find(t => t.id === todoId);
    if (!todo) return { success: false, error: `todo #${todoId} ga ketemu bro` };
    const newStatus = todo.status === 'done' ? 'active' : 'done';
    dbUpdateNoteStatus(userId, todoId, newStatus);
    return { success: true, status: newStatus, message: `todo "${todo.title}" → ${newStatus === 'done' ? '✅ done' : '⬜ active'}` };
};

/**
 * Cari catatan
 */
const searchNotes = (userId, query) => {
    if (!query) return [];
    return dbSearchNotes(userId, query);
};

/**
 * Hapus catatan/todo
 */
const deleteNote = (userId, noteId) => {
    const deleted = dbDeleteNote(userId, noteId);
    return deleted
        ? { success: true, message: `catatan #${noteId} udah dihapus ✅` }
        : { success: false, error: `catatan #${noteId} ga ketemu bro` };
};

/**
 * Format daftar catatan
 */
const formatNoteList = (notes) => {
    return '📝 *Catatan:*\n' + notes.map((n, i) =>
        `${i + 1}. [#${n.id}] *${n.title}*\n   ${(n.content || '').substring(0, 80)}${(n.content || '').length > 80 ? '...' : ''}`
    ).join('\n');
};

/**
 * Format daftar todo
 */
const formatTodoList = (todos) => {
    return '✍️ *To-Do List:*\n' + todos.map((t, i) => {
        const icon = t.status === 'done' ? '✅' : '⬜';
        return `${icon} [#${t.id}] ${t.title}`;
    }).join('\n');
};

module.exports = {
    createNote,
    createTodo,
    listNotes,
    listTodos,
    toggleTodo,
    searchNotes,
    deleteNote,
    formatNoteList,
    formatTodoList,
};
