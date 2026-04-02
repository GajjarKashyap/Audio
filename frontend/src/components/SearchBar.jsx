export function SearchBar({ value, onChange, loading }) {
  return (
    <div className="w-full flex items-center bg-[#1A1A1A] transition-colors hover:bg-[#282828] focus-within:bg-[#282828] mx-auto" style={{ borderRadius: '13px', padding: '13px 21px', gap: '13px', maxWidth: '400px' }}>
      <div className="flex shrink-0 items-center justify-center text-white" style={{ fontSize: '16px' }}>
        <svg viewBox="0 0 24 24" fill="currentColor" style={{ width: '21px', height: '21px' }}>
          <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
        </svg>
      </div>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search for tracks..."
        className="w-full bg-transparent text-white outline-none placeholder:text-[#B3B3B3]"
        style={{ fontSize: '16px', lineHeight: '21px' }}
      />
      {loading && (
        <div className="text-[#B3B3B3] shrink-0 font-semibold uppercase tracking-widest" style={{ fontSize: '12px' }}>
          Searching
        </div>
      )}
    </div>
  );
}
