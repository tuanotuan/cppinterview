// Day 13: Lambda Pack Capture and __VA_OPT__
#include <cstdio>
#include <iostream>

#define LOG(format, ...) std::printf(format __VA_OPT__(,) __VA_ARGS__)

template<class... Ts>
auto make_printer(Ts... items) {
    return [...values = items] {
        ((std::cout << values << ' '), ...);
        std::cout << '\n';
    };
}

int main() {
    auto print = make_printer(1, 2, 3);
    print();
    LOG("no extras\n");
    LOG("%s = %d\n", "answer", 42);
}
