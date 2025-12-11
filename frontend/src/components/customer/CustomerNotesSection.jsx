import React, {useEffect, useRef, useState} from "react";
import {
    getCustomerNotes,
    createCustomerNote,
    updateCustomerNote,
} from "../../services/customer.js";
import "../../assets/css/CustomerNotes.css";


const CustomerNotes = ({customerId}) => {
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);

    const [inputValue, setInputValue] = useState("");
    const [submitting, setSubmitting] = useState(false);

    const [editingNoteId, setEditingNoteId] = useState(null);

    const listRef = useRef(null);
    const [status, setStatus] = useState(null);

    const [blockNavigation, setBlockNavigation] = useState(false);
    const [textAreaDisabled, setTextAreaDisabled] = useState(false);


    useEffect(() => {
        const handler = (e) => {
            if (blockNavigation) {
                e.preventDefault();
                e.returnValue = "";
            }
        };

        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, [blockNavigation]);


    useEffect(() => {
        if (!customerId) return;

        const fetchNotes = async () => {
            setLoading(true);
            try {
                const res = await getCustomerNotes(customerId);
                const sorted = res.data.sort(
                    (a, b) => new Date(a.created_at) - new Date(b.created_at)
                ); // en eski yukarı
                setNotes(sorted);
            } catch (error) {
                console.error("Error fetching notes:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchNotes();
    }, [customerId]);

    // Yeni not geldiğinde / liste değiştiğinde alta scroll
    useEffect(() => {
        if (!loading && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [loading, notes.length]);

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const d = new Date(dateString);
        return d.toLocaleString("tr-TR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getNoteHeader = (note) => {
        const createdAt = note.created_at;
        const updatedAt = note.updated_at;
        const createdBy = note.created_by;
        const updatedBy = note.updated_by;

        const isUpdated =
            updatedAt &&
            createdAt &&
            new Date(updatedAt).getTime() !== new Date(createdAt).getTime();

        if (isUpdated) {
            return `${formatDate(updatedAt)} – ${createdBy} (updated by ${
                updatedBy || createdBy
            })`;
        }
        return `${formatDate(createdAt)} – ${createdBy}`;
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = inputValue.trim();
        if (!trimmed) return;

        setSubmitting(true);

        try {
            if (editingNoteId) {
                // Düzenleme modu
                await updateCustomerNote(editingNoteId, trimmed);

                setNotes((prev) =>
                    prev.map((n) =>
                        n.id === editingNoteId ? {...n, note: trimmed, updated_at: new Date().toISOString()} : n
                    )
                );
                setEditingNoteId(null);
            } else {
                // Yeni not
                const res = await createCustomerNote(customerId, trimmed);
                // backend yeni notu dönüyorsa:
                if (res.data) {
                    setNotes((prev) => [...prev, res.data]);
                } else {
                    // Dönmüyorsa local bir obje push ediyoruz
                    setNotes((prev) => [
                        ...prev,
                        {
                            id: Date.now(), // temp id
                            customer: "",
                            created_by: "",
                            updated_by: "",
                            created_at: new Date().toISOString(),
                            updated_at: new Date().toISOString(),
                            note: trimmed,
                        },
                    ]);
                }
            }

            setInputValue("");
        } catch (error) {
            console.error("Error submitting note:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleEditClick = (note) => {
        setEditingNoteId(note.id);
        setInputValue(note.note);
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setInputValue("");
    };
    const handleReached = () => {
        setStatus("reached");
        setBlockNavigation(true); // not zorunlu

        // textarea enabled
        setTextAreaDisabled(false);
    };
    const handleUnreachable = async () => {
  // buton state değişmeyecek, basılı kalmayacak
  // textarea da kilitlenmeyecek (istersen kilitleriz)

  const now = new Date();
  const formatted =
    now.toLocaleDateString("tr-TR") +
    " - " +
    now.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });

  const noteText = `Ulaşılamadı (${formatted})`;

  try {
    const res = await createCustomerNote(customerId, noteText);

    // listeye ekle
    setNotes((prev) => [...prev, res.data || {
      id: Date.now(),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      created_by: "Siz",
      note: noteText,
    }]);

    // textarea’yı eski haline döndür
    setTextAreaDisabled(false);

  } catch (err) {
    console.error("Ulaşılamadı notu oluşturulamadı:", err);
  }
};


    return (
        <div className="notes-container">
            <div className="note-status-buttons">
                {/*<button*/}
                {/*    className={`status-btn ${status === "reached" ? "active" : ""}`}*/}
                {/*    onClick={() => handleReached()}*/}
                {/*>*/}
                {/*    Ulaşıldı*/}
                {/*</button>*/}

                <button
                    className={`status-btn ${status === "unreachable" ? "active" : ""}`}
                    onClick={() => handleUnreachable()}
                >
                    Ulaşılamadı
                </button>
            </div>

            <h3 className="notes-title">Notlar</h3>

            <div className="notes-list" ref={listRef}>
                {loading ? (
                    <>
                        {[...Array(3)].map((_, idx) => (
                            <div key={idx} className="note-card skeleton-note">
                                <div className="skeleton-line header"/>
                                <div className="skeleton-line body"/>
                                <div className="skeleton-line body short"/>
                            </div>
                        ))}
                    </>
                ) : notes.length === 0 ? (
                    <div className="notes-empty">Bu müşteri için henüz not yok.</div>
                ) : (
                    notes.map((note) => (
                        <div key={note.id} className="note-card">
                            <div className="note-header">
                                <span className="note-meta">{getNoteHeader(note)}</span>
                                <button
                                    className="note-edit-btn"
                                    type="button"
                                    onClick={() => handleEditClick(note)}
                                >
                                    Düzenle
                                </button>
                            </div>
                            <div className="note-body">{note.note}</div>
                        </div>
                    ))
                )}
            </div>

            <form className="note-input-area" onSubmit={handleSubmit}>
        <textarea
            disabled={textAreaDisabled}
            className="note-textarea"
            placeholder={
                editingNoteId ? "Notu güncelle..." : "Yeni not yaz..."
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            rows={3}
        />

                <div className="note-input-actions">
                    {editingNoteId && (
                        <button
                            type="button"
                            className="note-cancel-btn"
                            onClick={handleCancelEdit}
                            disabled={submitting}
                        >
                            İptal
                        </button>
                    )}

                    <button
                        type="submit"
                        className="note-send-btn"
                        disabled={submitting || !inputValue.trim()}
                    >
                        {editingNoteId
                            ? submitting
                                ? "Güncelleniyor..."
                                : "Güncelle"
                            : submitting
                                ? "Gönderiliyor..."
                                : "Gönder"}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default CustomerNotes;
