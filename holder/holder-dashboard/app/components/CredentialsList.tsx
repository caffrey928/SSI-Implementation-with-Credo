import React, { useState } from "react";
import { StoredCredential } from "../../lib/types";

interface CredentialsListProps {
  credentials: StoredCredential[];
  onRefresh: () => void;
  onPageChange?: (page: string) => void;
}

const CredentialsList: React.FC<CredentialsListProps> = ({
  credentials,
  onRefresh,
  onPageChange,
}) => {
  const [selectedCredential, setSelectedCredential] =
    useState<StoredCredential | null>(null);

  const openModal = (credential: StoredCredential) => {
    setSelectedCredential(credential);
  };

  const closeModal = () => {
    setSelectedCredential(null);
  };

  if (credentials.length === 0) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              Stored Credentials
            </h2>
          </div>
          <button
            onClick={onRefresh}
            className="px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white bg-white/15 hover:bg-white/30 hover:border-white flex items-center space-x-2"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </button>
        </div>

        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div
              className="bg-white/10 backdrop-blur-xl rounded-2xl p-12 border border-white/20 max-w-md mx-auto"
              style={{
                boxShadow:
                  "0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="text-6xl mb-6">🎓</div>
              <h3 className="text-xl font-bold text-white mb-4">
                No Credentials Yet
              </h3>
              <p className="text-slate-300 mb-6">
                You haven't received any credentials yet. Use the Connect page
                to connect with issuers and receive your first credential.
              </p>
              <div className="flex justify-center">
                <button
                  onClick={() => onPageChange?.("scan")}
                  className="px-8 py-4 rounded-xl text-white font-semibold backdrop-blur-md border transition-all duration-300 border-purple-400 bg-purple-500/70 hover:bg-purple-500/90 hover:border-purple-300 flex items-center space-x-2"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                  <span>Connect</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  {
    console.log("Rendering credential:", credentials[0]);
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Stored Credentials</h2>
          <p className="text-slate-300 mt-1">
            Total: {credentials.length} credential
            {credentials.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          onClick={onRefresh}
          className="px-4 py-2 rounded-xl text-sm font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white/50 hover:bg-white/10"
        >
          <div className="flex items-center space-x-2">
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span>Refresh</span>
          </div>
        </button>
      </div>

      <div
        className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20"
        style={{
          boxShadow:
            "0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
        }}
      >
        {credentials.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-slate-500/20 rounded-full flex items-center justify-center">
              <span className="text-2xl">🎓</span>
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">
              No Credentials Yet
            </h3>
            <p className="text-slate-300">
              You haven't received any credentials yet. Use the Connect page to
              connect with issuers and receive your first credential.
            </p>
            <div className="mt-6">
              <button
                onClick={() => onPageChange?.("scan")}
                className="px-8 py-4 rounded-xl text-white font-semibold backdrop-blur-md border transition-all duration-300 border-purple-400 bg-purple-500/70 hover:bg-purple-500/90 hover:border-purple-300 flex items-center space-x-2 mx-auto"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                  />
                </svg>
                <span>Connect</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">
                    Schema Name
                  </th>
                  <th className="text-left py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">
                    Credential ID
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">
                    Definition Type
                  </th>
                  <th className="text-center py-4 px-6 text-sm font-medium text-slate-300 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {credentials
                  .sort(
                    (a, b) =>
                      new Date(b.issuedAt).getTime() -
                      new Date(a.issuedAt).getTime()
                  )
                  .map((credential) => (
                    <React.Fragment key={credential.credentialId}>
                      <tr className="hover:bg-white/5 transition-colors">
                        <td className="py-4 px-6">
                          <div className="text-white font-semibold">
                            {credential.schemaName || "Unknown Schema"}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-white font-mono text-sm break-all">
                            {credential.credentialId}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <div className="text-white font-medium">
                            {credential.definitionType || "Unknown"}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-center">
                          <button
                            onClick={() => openModal(credential)}
                            className="px-3 py-1 rounded-lg text-xs font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white/50 hover:bg-white/10 shadow-md"
                          >
                            Show Details
                          </button>
                        </td>
                      </tr>
                    </React.Fragment>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="text-center text-slate-400 text-sm">
        Showing {credentials.length} credential
        {credentials.length !== 1 ? "s" : ""}
      </div>

      {/* Modal */}
      {selectedCredential && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={closeModal}
        >
          <div
            className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            style={{
              boxShadow:
                "0 0 40px rgba(158, 202, 214, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.1)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">
                  Credential Details
                </h3>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Basic Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Schema Name
                      </p>
                      <p className="text-white font-medium">
                        {selectedCredential.schemaName || "Unknown Schema"}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        Definition Type
                      </p>
                      <p className="text-white font-medium">
                        {selectedCredential.definitionType || "Unknown"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Credential Attributes */}
                <div>
                  <h4 className="text-lg font-semibold text-white mb-3">
                    Credential Attributes
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(selectedCredential.attributes).map(
                      ([key, value]) => (
                        <div key={key} className="bg-white/5 rounded-lg p-3">
                          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                            {key}
                          </p>
                          <p className="text-white font-medium">
                            {key === "birthDate" &&
                            value.length === 8 &&
                            /^\d{8}$/.test(value)
                              ? `${value.slice(0, 4)}-${value.slice(
                                  4,
                                  6
                                )}-${value.slice(6, 8)}`
                              : value}
                          </p>
                        </div>
                      )
                    )}
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
                        issueddate
                      </p>
                      <p className="text-white font-medium">
                        {new Date(
                          selectedCredential.issuedAt
                        ).toLocaleDateString("sv-SE")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div>
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                        Credential ID
                      </p>
                      <p className="text-white font-mono text-sm break-all">
                        {selectedCredential.credentialId}
                      </p>
                    </div>

                    {selectedCredential.issuerId && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                          Issuer ID
                        </p>
                        <p className="text-white font-mono text-sm break-all">
                          {selectedCredential.issuerId}
                        </p>
                      </div>
                    )}

                    {selectedCredential.schemaId && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                          Schema ID
                        </p>
                        <p className="text-white font-mono text-sm break-all">
                          {selectedCredential.schemaId}
                        </p>
                      </div>
                    )}

                    {selectedCredential.credentialDefinitionId && (
                      <div className="bg-white/5 rounded-lg p-3">
                        <p className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                          Credential Definition ID
                        </p>
                        <p className="text-white font-mono text-sm break-all">
                          {selectedCredential.credentialDefinitionId}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-4 border-t border-white/10">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur-md border text-white transition-all duration-300 border-white/50 hover:bg-white/10"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CredentialsList;
