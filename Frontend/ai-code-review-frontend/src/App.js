import React, { useState } from "react";
import axios from "axios";

function App() {
    const [view, setView] = useState("login"); // "login" | "register" | "review"
    const [form, setForm] = useState({
        name: "",
        username: "",
        password: "",
        github_token: "",
    });
    const [token, setToken] = useState("");
    const [repo, setRepo] = useState("");
    const [prNumber, setPrNumber] = useState("");
    const [reviews, setReviews] = useState({});
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const API_URL = "http://localhost:8000";

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    // REGISTER
    const handleRegister = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_URL}/auth/register`, form);
            setError("");
            alert("✅ Registration successful. Please login.");
            setView("login");
        } catch (err) {
            setError(err.response?.data?.detail || "❌ Registration failed");
        }
    };

    // LOGIN
    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_URL}/auth/login`, {
                username: form.username,
                password: form.password,
            });
            setToken(res.data.access_token);
            setError("");
            setView("review"); // redirect to review page
        } catch (err) {
            setError(err.response?.data?.detail || "❌ Login failed");
        }
    };

    // REVIEW PR
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!repo || !prNumber) return;

        setLoading(true);
        setError("");
        setSuccess(false);
        setReviews({});

        try {
            const response = await axios.post(
                `${API_URL}/review-pr`,
                { repo: repo.trim(), pr_number: Number(prNumber) },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setReviews(response.data.reviews);
            setSuccess(true);
        } catch (err) {
            const errorMessage =
                err.response?.data?.detail ||
                err.message ||
                "Failed to fetch review. Please check your inputs.";
            setError(errorMessage);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setRepo("");
        setPrNumber("");
        setReviews({});
        setError("");
        setSuccess(false);
    };

    return (
        <div style={styles.page}>
            <div style={styles.container}>
                {view === "register" && (
                    <form onSubmit={handleRegister} style={styles.form}>
                        <h2 style={styles.title}>🔐 Register</h2>
                        <input
                            type="text"
                            name="name"
                            placeholder="Full Name"
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                        <input
                            type="text"
                            name="github_token"
                            placeholder="GitHub Token"
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                        <button type="submit" style={styles.buttonPrimary}>
                            Register
                        </button>
                        <p
                            onClick={() => setView("login")}
                            style={styles.link}
                        >
                            Already have an account? Login
                        </p>
                        {error && <p style={styles.errorText}>{error}</p>}
                    </form>
                )}

                {view === "login" && (
                    <form onSubmit={handleLogin} style={styles.form}>
                        <h2 style={styles.title}>🔑 Login</h2>
                        <input
                            type="text"
                            name="username"
                            placeholder="Username"
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                        <input
                            type="password"
                            name="password"
                            placeholder="Password"
                            onChange={handleChange}
                            required
                            style={styles.input}
                        />
                        <button type="submit" style={styles.buttonPrimary}>
                            Login
                        </button>
                        <p
                            onClick={() => setView("register")}
                            style={styles.link}
                        >
                            Don’t have an account? Register
                        </p>
                        {error && <p style={styles.errorText}>{error}</p>}
                    </form>
                )}

                {view === "review" && (
                    <>
                        <header style={styles.header}>
                            <h1 style={styles.title}>🚀 AI Code Review</h1>
                            <p style={styles.subtitle}>
                                Get intelligent feedback on your GitHub pull requests
                            </p>
                        </header>

                        <form onSubmit={handleSubmit} style={styles.form}>
                            <input
                                type="text"
                                value={repo}
                                onChange={(e) => setRepo(e.target.value)}
                                required
                                placeholder="e.g. facebook/react"
                                style={styles.input}
                                disabled={loading}
                            />
                            <input
                                type="number"
                                min="1"
                                value={prNumber}
                                onChange={(e) =>
                                    setPrNumber(e.target.value.replace(/[^0-9]/g, ""))
                                }
                                required
                                placeholder="e.g. 123"
                                style={styles.input}
                                disabled={loading}
                            />
                            <button
                                type="submit"
                                disabled={loading || !repo || !prNumber}
                                style={styles.buttonPrimary}
                            >
                                {loading ? "Reviewing..." : "Get AI Review"}
                            </button>
                            {reviews && Object.keys(reviews).length > 0 && (
                                <button
                                    type="button"
                                    onClick={handleReset}
                                    style={styles.buttonSecondary}
                                >
                                    New Review
                                </button>
                            )}
                        </form>

                        {error && <p style={styles.errorText}>{error}</p>}

                        {Object.keys(reviews).length > 0 && (
                            <div style={styles.resultsSection}>
                                <h2>📝 Code Review Results</h2>
                                {Object.entries(reviews).map(([filename, review]) => (
                                    <div key={filename} style={styles.reviewCard}>
                                        <h3 style={styles.filename}>{filename}</h3>
                                        <pre style={styles.reviewText}>{review}</pre>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

const styles = {
    page: {
        fontFamily: "'Inter', sans-serif",
        backgroundColor: "#f8fafc",
        minHeight: "100vh",
        padding: "1rem",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
    },
    container: {
        maxWidth: "600px",
        width: "100%",
        backgroundColor: "#fff",
        padding: "2rem",
        borderRadius: "12px",
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
    },
    header: {
        textAlign: "center",
        marginBottom: "1.5rem",
    },
    title: {
        fontSize: "1.75rem",
        fontWeight: "700",
        background: "linear-gradient(90deg,#3b82f6,#8b5cf6)",
        WebkitBackgroundClip: "text",
        WebkitTextFillColor: "transparent",
        margin: "0.5rem 0",
    },
    subtitle: {
        color: "#64748b",
    },
    form: {
        display: "flex",
        flexDirection: "column",
        gap: "1rem",
    },
    input: {
        padding: "0.875rem",
        borderRadius: "8px",
        border: "1px solid #d1d5db",
        fontSize: "1rem",
    },
    buttonPrimary: {
        padding: "0.875rem",
        borderRadius: "8px",
        backgroundColor: "#3b82f6",
        color: "#fff",
        fontWeight: "600",
        cursor: "pointer",
        border: "none",
    },
    buttonSecondary: {
        padding: "0.875rem",
        borderRadius: "8px",
        backgroundColor: "#e5e7eb",
        color: "#374151",
        fontWeight: "600",
        cursor: "pointer",
        border: "none",
    },
    link: {
        color: "#3b82f6",
        textAlign: "center",
        cursor: "pointer",
    },
    errorText: {
        color: "red",
        fontWeight: "500",
        textAlign: "center",
    },
    resultsSection: {
        marginTop: "2rem",
    },
    reviewCard: {
        background: "#f1f5f9",
        padding: "1rem",
        borderRadius: "8px",
        marginBottom: "1rem",
    },
    filename: {
        fontWeight: "600",
        marginBottom: "0.5rem",
        color: "#2563eb",
    },
    reviewText: {
        whiteSpace: "pre-wrap",
        fontSize: "0.9rem",
    },
};

export default App;
