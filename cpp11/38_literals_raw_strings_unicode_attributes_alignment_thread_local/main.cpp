#include <cstddef>
#include <iostream>

constexpr unsigned long long operator"" _kb(unsigned long long value) {
    return value * 1024ULL;
}

thread_local int calls = 0;

struct alignas(16) Block {
    char bytes[16];
};

[[noreturn]] void stop() {
    throw 1;
}

int main() {
    const char* path = R"(C:\ticks\day1)";
    const char* text = u8"Giá";
    ++calls;

    std::cout << "bytes=" << 2_kb << '\n';
    std::cout << "path=" << path << '\n';
    std::cout << "text=" << text << '\n';
    std::cout << "alignment=" << alignof(Block) << " calls=" << calls << '\n';

    try { stop(); } catch (int) { std::cout << "caught\n"; }
}
