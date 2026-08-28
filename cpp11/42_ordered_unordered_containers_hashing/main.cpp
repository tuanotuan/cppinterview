#include <iostream>
#include <map>
#include <string>
#include <unordered_map>

int main() {
    std::map<std::string, int> ordered;
    ordered["beta"] = 2;
    ordered["alpha"] = 1;

    std::unordered_map<std::string, int> hashed;
    hashed["ticks"] = 42;

    std::cout << "ordered_first=" << ordered.begin()->first << '\n';
    std::cout << "lookup=" << hashed.at("ticks") << '\n';
    std::cout << "hash=" << std::hash<std::string>()("ticks") << '\n';
}
