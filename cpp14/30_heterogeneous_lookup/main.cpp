#include <functional>
#include <iostream>
#include <map>
#include <string>

int main() {
    std::map<std::string, int, std::less<>> scores{
        {"an", 80}, {"mai", 95}
    };

    const char* probe = "mai";
    const auto found = scores.find(probe);
    if (found != scores.end()) {
        std::cout << found->first << ": " << found->second << "\n";
    }
}
