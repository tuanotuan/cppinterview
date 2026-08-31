#include <iostream>
#include <string>
#include <version>

#if __has_include(<flat_map>)
#include <flat_map>
#endif

int main() {
#if defined(__cpp_lib_flat_map)
    std::flat_map<int, std::string> unique{{2, "two"}, {1, "one"}};
    std::flat_multimap<int, std::string> repeated{
        {1, "first"}, {1, "second"}};

    for (const auto& [key, value] : unique)
        std::cout << key << ':' << value << ' ';
    std::cout << "duplicates=" << repeated.count(1) << '\n';
#else
    std::cout << "flat_map and flat_multimap unavailable\n";
#endif
}
