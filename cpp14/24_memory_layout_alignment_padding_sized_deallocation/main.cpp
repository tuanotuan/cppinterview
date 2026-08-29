#include <cstddef>
#include <iostream>
#include <new>

struct Layout {
    char tag;
    int value;
    short code;
};

struct Node {
    int value = 42;

    static void* operator new(std::size_t size) {
        return ::operator new(size);
    }

    static void operator delete(void* pointer, std::size_t size) noexcept {
        std::cout << "sized delete: " << size << "\n";
        ::operator delete(pointer);
    }
};

int main() {
    std::cout << "align: " << alignof(Layout) << "\n";
    std::cout << "size: " << sizeof(Layout) << "\n";
    std::cout << "value offset: " << offsetof(Layout, value) << "\n";
    Node* node = new Node;
    std::cout << "node value: " << node->value << "\n";
    delete node;
}
