#include <iostream>

class Guard {
public:
    explicit Guard(bool& resource) : resource_(resource) {
        resource_ = true;
        std::cout << "acquired\n";
    }

    ~Guard() {
        resource_ = false;
        std::cout << "released\n";
    }

private:
    bool& resource_;
};

int main() {
    bool in_use = false;
    {
        Guard guard(in_use);
        std::cout << "inside=" << in_use << '\n';
    } // guard releases automatically
    std::cout << "outside=" << in_use << '\n';
}
