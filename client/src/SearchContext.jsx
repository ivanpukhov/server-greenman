import { createContext, useContext, useState } from 'react';

const SearchContext = createContext();

export function useSearch() {
    return useContext(SearchContext);
}

export const SearchProvider = ({ children }) => {
    const [query, setQuery] = useState("");

    const handleSearch = (newQuery) => {
        setQuery(newQuery);
    };

    return (
        <SearchContext.Provider value={{ query, handleSearch }}>
            {children}
        </SearchContext.Provider>
    );
};
