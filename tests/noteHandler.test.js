/**
 * Tests for Note Handler
 */

jest.mock('../src/database');

const {
    createNote,
    createTodo,
    listNotes,
    listTodos,
    toggleTodo,
    searchNotes,
    deleteNote,
    formatNoteList,
    formatTodoList,
} = require('../src/noteHandler');

const db = require('../src/database');

describe('Note Handler', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        db.createNote.mockReturnValue({ id: 1 });
        db.getUserNotes.mockReturnValue([]);
        db.searchNotes.mockReturnValue([]);
        db.deleteNote.mockReturnValue(false);
    });

    describe('createNote', () => {
        test('should create note with title and content', () => {
            const result = createNote('user1', 'Judul', 'Isi catatan');
            expect(result.success).toBe(true);
            expect(result.id).toBe(1);
            expect(result.message).toContain('Judul');
            expect(db.createNote).toHaveBeenCalledWith('user1', 'note', 'Judul', 'Isi catatan');
        });

        test('should use title as content if content is empty', () => {
            createNote('user1', 'Judul saja', '');
            expect(db.createNote).toHaveBeenCalledWith('user1', 'note', 'Judul saja', 'Judul saja');
        });

        test('should use default title if title is empty', () => {
            createNote('user1', '', 'Isi saja');
            expect(db.createNote).toHaveBeenCalledWith('user1', 'note', 'Catatan', 'Isi saja');
        });

        test('should fail with both empty', () => {
            const result = createNote('user1', '', '');
            expect(result.success).toBe(false);
        });
    });

    describe('createTodo', () => {
        test('should create todo', () => {
            const result = createTodo('user1', 'Beli susu');
            expect(result.success).toBe(true);
            expect(result.message).toContain('Beli susu');
            expect(db.createNote).toHaveBeenCalledWith('user1', 'todo', 'Beli susu', 'Beli susu');
        });

        test('should fail with empty title', () => {
            const result = createTodo('user1', '');
            expect(result.success).toBe(false);
        });
    });

    describe('listNotes', () => {
        test('should return empty message when no notes', () => {
            db.getUserNotes.mockReturnValue([]);
            const result = listNotes('user1');
            expect(result).toContain('belum ada catatan');
        });

        test('should format note list', () => {
            db.getUserNotes.mockReturnValue([
                { id: 1, title: 'Note 1', content: 'Content 1' },
                { id: 2, title: 'Note 2', content: 'Content 2' },
            ]);
            const result = listNotes('user1');
            expect(result).toContain('Note 1');
            expect(result).toContain('Note 2');
            expect(db.getUserNotes).toHaveBeenCalledWith('user1', 'note');
        });
    });

    describe('listTodos', () => {
        test('should return empty message when no todos', () => {
            db.getUserNotes.mockReturnValue([]);
            const result = listTodos('user1');
            expect(result).toContain('belum ada todo');
        });

        test('should format todo list', () => {
            db.getUserNotes.mockReturnValue([
                { id: 1, title: 'Todo 1', status: 'active' },
                { id: 2, title: 'Todo 2', status: 'done' },
            ]);
            const result = listTodos('user1');
            expect(result).toContain('Todo 1');
            expect(result).toContain('Todo 2');
            expect(result).toContain('✅');
            expect(result).toContain('⬜');
        });
    });

    describe('toggleTodo', () => {
        test('should toggle active to done', () => {
            db.getUserNotes.mockReturnValue([{ id: 1, title: 'Todo', status: 'active' }]);
            const result = toggleTodo('user1', 1);
            expect(result.success).toBe(true);
            expect(result.status).toBe('done');
            expect(db.updateNoteStatus).toHaveBeenCalledWith('user1', 1, 'done');
        });

        test('should toggle done to active', () => {
            db.getUserNotes.mockReturnValue([{ id: 1, title: 'Todo', status: 'done' }]);
            const result = toggleTodo('user1', 1);
            expect(result.success).toBe(true);
            expect(result.status).toBe('active');
        });

        test('should fail for nonexistent todo', () => {
            db.getUserNotes.mockReturnValue([]);
            const result = toggleTodo('user1', 999);
            expect(result.success).toBe(false);
            expect(result.error).toContain('ga ketemu');
        });
    });

    describe('searchNotes', () => {
        test('should search with query', () => {
            db.searchNotes.mockReturnValue([{ id: 1, title: 'Match' }]);
            const result = searchNotes('user1', 'match');
            expect(result).toHaveLength(1);
        });

        test('should return empty for empty query', () => {
            expect(searchNotes('user1', '')).toEqual([]);
        });
    });

    describe('deleteNote', () => {
        test('should delete existing note', () => {
            db.deleteNote.mockReturnValue(true);
            const result = deleteNote('user1', 1);
            expect(result.success).toBe(true);
        });

        test('should fail for nonexistent note', () => {
            db.deleteNote.mockReturnValue(false);
            const result = deleteNote('user1', 999);
            expect(result.success).toBe(false);
        });
    });

    describe('formatNoteList', () => {
        test('should format notes with truncated content', () => {
            const notes = [{ id: 1, title: 'Title', content: 'A'.repeat(100) }];
            const result = formatNoteList(notes);
            expect(result).toContain('Title');
            expect(result).toContain('...');
        });
    });

    describe('formatTodoList', () => {
        test('should show done icon for completed', () => {
            const todos = [{ id: 1, title: 'Done', status: 'done' }];
            expect(formatTodoList(todos)).toContain('✅');
        });

        test('should show open icon for active', () => {
            const todos = [{ id: 1, title: 'Active', status: 'active' }];
            expect(formatTodoList(todos)).toContain('⬜');
        });
    });
});
