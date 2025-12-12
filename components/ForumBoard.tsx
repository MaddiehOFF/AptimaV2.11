
import React, { useState } from 'react';
import { Employee, ForumPost, User } from '../types';
import { Send, Image as ImageIcon, Heart, MessageSquare, Trash2, ShieldCheck, User as UserIcon } from 'lucide-react';
import { ConfirmationModal } from './common/ConfirmationModal';

interface ForumBoardProps {
    posts: ForumPost[];
    setPosts: React.Dispatch<React.SetStateAction<ForumPost[]>>;
    currentUser: User | null;
    currentMember: Employee | null;
}

export const ForumBoard: React.FC<ForumBoardProps> = ({ posts, setPosts, currentUser, currentMember }) => {
    const [newContent, setNewContent] = useState('');
    const [newImageUrl, setNewImageUrl] = useState('');
    const [showImageInput, setShowImageInput] = useState(false);

    const [confirmModal, setConfirmModal] = useState<{
        isOpen: boolean;
        title: string;
        message: string;
        onConfirm: () => void;
    }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { },
    });

    const canPost = !!currentUser; // Only admins can post
    const viewerId = currentUser ? currentUser.id : (currentMember ? currentMember.id : 'guest');

    const generateUUID = () => {
        if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };

    const handleCreatePost = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContent.trim()) return;

        const post: ForumPost = {
            id: generateUUID(),
            author: currentUser?.name || 'Admin',
            authorRole: 'Administración',
            content: newContent,
            imageUrl: newImageUrl || undefined,
            date: new Date().toISOString(),
            likes: []
        };

        setPosts([post, ...posts]);
        setNewContent('');
        setNewImageUrl('');
        setShowImageInput(false);
    };

    const toggleLike = (postId: string) => {
        setPosts(posts.map(p => {
            if (p.id === postId) {
                const hasLiked = p.likes.includes(viewerId);
                const newLikes = hasLiked
                    ? p.likes.filter(id => id !== viewerId)
                    : [...p.likes, viewerId];
                return { ...p, likes: newLikes };
            }
            return p;
        }));
    };

    const deletePost = (postId: string) => {
        setConfirmModal({
            isOpen: true,
            title: '¿Borrar Publicación?',
            message: '¿Estás seguro de que quieres borrar esta publicación?',
            onConfirm: () => {
                setPosts(posts.filter(p => p.id !== postId));
            }
        });
    };

    // Helper for upload simulation
    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setNewImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
            <div className="text-center">
                <h2 className="text-3xl font-serif text-gray-900 dark:text-white">Foro Sushiblack</h2>
                <p className="text-gray-500 dark:text-sushi-muted mt-2">Novedades, anuncios y cultura de equipo.</p>
            </div>

            {/* Create Post Area (Admin Only) */}
            {canPost && (
                <div className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl p-6 shadow-lg">
                    <form onSubmit={handleCreatePost}>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 rounded-full bg-sushi-gold flex items-center justify-center text-sushi-black font-bold">
                                <ShieldCheck className="w-6 h-6" />
                            </div>
                            <div className="flex-1 space-y-4">
                                <textarea
                                    value={newContent}
                                    onChange={(e) => setNewContent(e.target.value)}
                                    placeholder="¿Qué quieres comunicar al equipo hoy?"
                                    className="w-full bg-gray-50 dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-lg p-4 text-gray-900 dark:text-white focus:border-sushi-gold outline-none resize-none min-h-[100px]"
                                />

                                {showImageInput && (
                                    <div className="animate-fade-in space-y-2">
                                        {newImageUrl && (
                                            <div className="relative w-full h-48 bg-black/50 rounded-lg overflow-hidden mb-2">
                                                <img src={newImageUrl} className="w-full h-full object-cover" alt="Preview" />
                                                <button type="button" onClick={() => setNewImageUrl('')} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                            </div>
                                        )}
                                        <div className="flex gap-2">
                                            <label className="flex-1 cursor-pointer bg-gray-100 dark:bg-white/5 border border-dashed border-gray-300 dark:border-white/20 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 dark:text-sushi-muted hover:border-sushi-gold transition-colors">
                                                <ImageIcon className="w-6 h-6 mb-2" />
                                                <span className="text-xs">Subir Imagen (Click aquí)</span>
                                                <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                            </label>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-between items-center pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowImageInput(!showImageInput)}
                                        className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-sm ${showImageInput ? 'bg-sushi-gold/20 text-sushi-gold' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-white/5'}`}
                                    >
                                        <ImageIcon className="w-5 h-5" />
                                        Imagen
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={!newContent}
                                        className="bg-sushi-gold text-sushi-black px-6 py-2 rounded-lg font-bold hover:bg-sushi-goldhover disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-sushi-gold/20 flex items-center gap-2"
                                    >
                                        <Send className="w-4 h-4" /> Publicar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            )}

            {/* Posts Feed */}
            <div className="space-y-6">
                {posts.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50 dark:bg-white/[0.02] border border-dashed border-gray-200 dark:border-white/10 rounded-xl">
                        <MessageSquare className="w-12 h-12 text-gray-300 dark:text-sushi-muted mx-auto mb-3" />
                        <p className="text-gray-500 dark:text-sushi-muted">Aún no hay publicaciones en el muro.</p>
                    </div>
                ) : (
                    posts.map(post => {
                        const isLiked = post.likes.includes(viewerId);
                        return (
                            <div key={post.id} className="bg-white dark:bg-sushi-dark border border-gray-200 dark:border-white/5 rounded-xl overflow-hidden shadow-md animate-slide-up">
                                {/* Header */}
                                <div className="p-4 flex justify-between items-start">
                                    <div className="flex gap-3">
                                        <div className="w-10 h-10 rounded-full bg-black dark:bg-white/10 flex items-center justify-center border border-sushi-gold/30">
                                            <ShieldCheck className="w-5 h-5 text-sushi-gold" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-900 dark:text-white">{post.author}</h4>
                                            <p className="text-xs text-sushi-gold uppercase tracking-wider">{post.authorRole}</p>
                                            <p className="text-[10px] text-gray-400 dark:text-sushi-muted mt-0.5">
                                                {new Date(post.date).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                                            </p>
                                        </div>
                                    </div>
                                    {canPost && (
                                        <button onClick={() => deletePost(post.id)} className="text-gray-400 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="px-4 pb-2">
                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                                        {post.content}
                                    </p>
                                </div>

                                {/* Image Attachment */}
                                {post.imageUrl && (
                                    <div className="mt-2 w-full h-64 md:h-80 bg-black/50 overflow-hidden">
                                        <img src={post.imageUrl} className="w-full h-full object-cover" alt="Post attachment" />
                                    </div>
                                )}

                                {/* Actions Footer */}
                                <div className="p-4 border-t border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-black/20 flex items-center gap-4">
                                    <button
                                        onClick={() => toggleLike(post.id)}
                                        className={`flex items-center gap-2 text-sm font-medium transition-colors ${isLiked ? 'text-red-500' : 'text-gray-500 dark:text-sushi-muted hover:text-gray-900 dark:hover:text-white'}`}
                                    >
                                        <Heart className={`w-5 h-5 ${isLiked ? 'fill-red-500' : ''}`} />
                                        {post.likes.length} {post.likes.length === 1 ? 'Me gusta' : 'Me gusta'}
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            {/* Confirmation Modal */}
            <ConfirmationModal
                isOpen={confirmModal.isOpen}
                onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                onConfirm={confirmModal.onConfirm}
                title={confirmModal.title}
                message={confirmModal.message}
                type="danger"
                confirmText="BORRAR"
            />
        </div>
    );
};
