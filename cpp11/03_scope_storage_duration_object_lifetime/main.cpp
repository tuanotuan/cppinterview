#include <iostream>

int next_call() {
    static int calls = 0; // storage lasts for the whole program
    return ++calls;
}

int main() {
    int outer = 10;
    {
        int inner = 5; // automatic lifetime ends with this block
        std::cout << "inside=" << outer + inner << '\n';
    }

    std::cout << "calls=" << next_call() << ',' << next_call() << '\n';
}
