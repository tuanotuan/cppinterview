#include <iostream>
#include <string>

struct Config {
    inline static std::string mode = "C++17";
    inline static int reads = 0;
};

void read_once() {
    ++Config::reads;
}

int main() {
    read_once();
    read_once();
    std::cout << "mode: " << Config::mode << '\n';
    std::cout << "reads: " << Config::reads << '\n';
}
