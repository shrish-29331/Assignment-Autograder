import client from "./client";

export const authApi = {
  register: (payload) => client.post("/api/auth/register", payload),
  login: (payload) => client.post("/api/auth/login", payload),
  me: () => client.get("/api/auth/me"),
};

export const assignmentsApi = {
  list: () => client.get("/api/assignments"),
  get: (id) => client.get(`/api/assignments/${id}`),
  create: (payload) => client.post("/api/assignments", payload),
  remove: (id) => client.delete(`/api/assignments/${id}`),
};

export const submissionsApi = {
  submit: (assignmentId, file) => {
    const form = new FormData();
    form.append("file", file);
    return client.post(`/api/submissions?assignment_id=${assignmentId}`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  mine: (assignmentId) =>
    client.get("/api/submissions/mine", { params: assignmentId ? { assignment_id: assignmentId } : {} }),
  byAssignment: (assignmentId) => client.get(`/api/submissions/by-assignment/${assignmentId}`),
  get: (id) => client.get(`/api/submissions/${id}`),
};

export const plagiarismApi = {
  check: (assignmentId, threshold = 0.8) =>
    client.post(`/api/plagiarism/${assignmentId}/check`, null, { params: { threshold } }),
  latest: (assignmentId) => client.get(`/api/plagiarism/${assignmentId}/latest`),
};
