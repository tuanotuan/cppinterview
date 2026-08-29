#include <iostream>
#include <map>
#include <string>

int main() {
    const std::map<std::string, int> scores{{"Ada", 91}, {"Linus", 88}};

    if (const auto it = scores.find("Ada"); it != scores.end()) {
        std::cout << it->first << ": " << it->second << '\n';
        switch (const int score = it->second; score / 10) {
        case 10:
        case 9:
            std::cout << "excellent\n";
            break;
        default:
            std::cout << "keep practicing\n";
        }
    }
}
