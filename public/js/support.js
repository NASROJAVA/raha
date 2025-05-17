/**
 * Support page functionality
 * Handles search and filtering for psychologists
 */

document.addEventListener('DOMContentLoaded', function() {
    // Search functionality
    const searchInput = document.getElementById('searchPsychologists');
    const psychologistCards = document.querySelectorAll('.psychologist-card');
    
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.trim().toLowerCase();
            
            psychologistCards.forEach(card => {
                const psychologistName = card.querySelector('h3').textContent.toLowerCase();
                const specialization = card.querySelector('p').textContent.toLowerCase();
                const tags = Array.from(card.querySelectorAll('.flex-wrap.gap-2.my-3 span')).map(tag => tag.textContent.toLowerCase());
                
                // Check if search term is in name, specialization or tags
                const matchesSearch = 
                    psychologistName.includes(searchTerm) || 
                    specialization.includes(searchTerm) ||
                    tags.some(tag => tag.includes(searchTerm));
                
                // Show or hide based on search
                card.style.display = matchesSearch ? 'block' : 'none';
            });
        });
    }
    
    // Filter tabs functionality
    const filterButtons = document.querySelectorAll('.bg-gray-50.px-6.py-3.border-b.border-gray-200.flex.overflow-x-auto button');
    
    if (filterButtons.length) {
        filterButtons.forEach(button => {
            button.addEventListener('click', function() {
                // Remove active class from all buttons
                filterButtons.forEach(btn => {
                    btn.classList.remove('bg-primary', 'text-white');
                    btn.classList.add('text-gray-700', 'hover:bg-gray-200');
                });
                
                // Add active class to clicked button
                this.classList.remove('text-gray-700', 'hover:bg-gray-200');
                this.classList.add('bg-primary', 'text-white');
                
                const filterValue = this.textContent.trim().toLowerCase();
                
                // Filter cards
                psychologistCards.forEach(card => {
                    if (filterValue === 'الكل') {
                        card.style.display = 'block';
                    } else {
                        const tags = Array.from(card.querySelectorAll('.flex-wrap.gap-2.my-3 span')).map(tag => tag.textContent.toLowerCase());
                        const matchesFilter = tags.some(tag => tag.includes(filterValue));
                        card.style.display = matchesFilter ? 'block' : 'none';
                    }
                });
            });
        });
    }
    
    // Add animation effects
    psychologistCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.classList.add('transform', 'scale-[1.02]');
        });
        
        card.addEventListener('mouseleave', function() {
            this.classList.remove('transform', 'scale-[1.02]');
        });
    });
});
